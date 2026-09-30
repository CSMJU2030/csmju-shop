import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  buildMeta,
  generateOrderNumber,
  generatePickupCode,
  orderNumberPrefix,
  orderNumberSequence,
} from '../common/utils/helpers.js';
import { DEFAULT_SHIPPING_FEE } from '../common/constants.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { QueryOrderDto } from './dto/query-order.dto.js';
import {
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
  UploadSlipDto,
} from './dto/update-order-status.dto.js';
import { UpdateShippingDto } from './dto/update-shipping.dto.js';

/** ข้อมูลที่แนบไปกับคำสั่งซื้อทุกครั้ง */
export const ORDER_INCLUDE = {
  user: {
    select: { user_id: true, student_id: true, fullname: true, email: true, phone: true },
  },
  order_items: {
    include: {
      variant: {
        include: {
          product: { select: { product_id: true, name: true, category: true, is_preorder: true } },
        },
      },
    },
  },
  pickup_logs: {
    include: { staff: { select: { user_id: true, fullname: true, role: true } } },
  },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryOrderDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.OrderWhereInput = {
      ...(query.user_id ? { user_id: query.user_id } : {}),
      ...(query.order_status ? { order_status: query.order_status } : {}),
      ...(query.payment_status ? { payment_status: query.payment_status } : {}),
      ...(query.delivery_method ? { delivery_method: query.delivery_method } : {}),
      ...(query.search
        ? {
            OR: [
              { order_number: { contains: query.search, mode: 'insensitive' } },
              { pickup_code: { contains: query.search, mode: 'insensitive' } },
              { tracking_number: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: query.skip,
        take: limit,
        orderBy: { order_id: 'desc' },
        include: ORDER_INCLUDE,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      message: 'ดึงรายการคำสั่งซื้อสำเร็จ',
      data: rows,
      meta: buildMeta(page, limit, total),
    };
  }

  async findOne(order_id: number) {
    const order = await this.prisma.order.findUnique({
      where: { order_id },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException('ไม่พบคำสั่งซื้อ');

    return { message: 'ดึงข้อมูลคำสั่งซื้อสำเร็จ', data: order };
  }

  async findByNumber(order_number: string) {
    const order = await this.prisma.order.findUnique({
      where: { order_number },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException('ไม่พบคำสั่งซื้อจากเลขที่นี้');

    return { message: 'ดึงข้อมูลคำสั่งซื้อสำเร็จ', data: order };
  }

  /**
   * สร้างคำสั่งซื้อ — ทุกขั้นอยู่ใน transaction เดียว
   * ตรวจผู้ใช้/สินค้า → ตรวจสต็อก → ตัดสต็อก → คำนวณยอด → ออกเลขที่และรหัสรับ
   *
   * ลองใหม่ได้สูงสุด 3 ครั้งถ้าเจอ P2002 (เลขที่ออร์เดอร์หรือรหัสรับซ้ำ)
   * เกิดได้ตอนสองคนกดสั่งพร้อมกันเป๊ะ ๆ หรือรหัสรับที่สุ่มมาดันซ้ำของเดิม
   * ลองใหม่แล้วจะได้เลขถัดไปเอง ดีกว่าโยน error ใส่หน้าลูกค้า
   */
  async create(dto: CreateOrderDto) {
    if (dto.delivery_method === 'delivery' && !dto.shipping_address) {
      throw new UnprocessableEntityException('การจัดส่งแบบ delivery ต้องระบุ shipping_address');
    }

    for (let attempt = 1; ; attempt++) {
      try {
        return await this.createOnce(dto);
      } catch (e) {
        const duplicate =
          e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && attempt < 3;
        if (!duplicate) throw e;
      }
    }
  }

  /** ความพยายามสร้างออร์เดอร์หนึ่งครั้ง (ดู create() ด้านบน) */
  private async createOnce(dto: CreateOrderDto) {
    const order = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { user_id: dto.user_id } });
      if (!user) throw new NotFoundException('ไม่พบผู้ใช้ (user_id)');

      const variantIds = [...new Set(dto.items.map((i) => i.variant_id))];
      const variants = await tx.productVariant.findMany({
        where: { variant_id: { in: variantIds } },
        include: { product: true },
      });
      if (variants.length !== variantIds.length) {
        throw new NotFoundException('มี variant_id ที่ไม่มีอยู่จริง');
      }

      const variantMap = new Map(variants.map((v) => [v.variant_id, v]));
      let subtotal = 0;
      const itemData: Prisma.OrderItemCreateManyOrderInput[] = [];

      for (const item of dto.items) {
        const variant = variantMap.get(item.variant_id)!;
        const isPreorder = variant.product.is_preorder === true;

        // สินค้าพรีออเดอร์สั่งได้แม้สต็อกเป็น 0
        if (!isPreorder && (variant.stock_quantity ?? 0) < item.quantity) {
          throw new ConflictException(
            `สต็อกไม่พอสำหรับ "${variant.product.name} - ${variant.variant_name}" ` +
              `(คงเหลือ ${variant.stock_quantity ?? 0}, ต้องการ ${item.quantity})`,
          );
        }

        const unitPrice = Number(variant.price);
        subtotal += unitPrice * item.quantity;

        itemData.push({
          variant_id: variant.variant_id,
          quantity: item.quantity,
          unit_price: unitPrice,
          is_preorder_item: isPreorder,
        });

        await tx.productVariant.update({
          where: { variant_id: variant.variant_id },
          data: { stock_quantity: { decrement: item.quantity } },
        });
      }

      const fee =
        dto.delivery_method === 'delivery' ? (dto.shipping_fee ?? DEFAULT_SHIPPING_FEE) : 0;
      const total = Number((subtotal + fee).toFixed(2));
      // เดินเลขต่อจาก "เลขที่สูงสุดของเดือนนี้" ไม่ใช่จากจำนวนออร์เดอร์ที่มีอยู่
      // เพราะพอมีการลบออร์เดอร์ จำนวนจะลดลงแล้วเลขที่จะวนกลับไปชนของเดิม (P2002)
      const prefix = orderNumberPrefix();
      const latest = await tx.order.findFirst({
        where: { order_number: { startsWith: prefix } },
        orderBy: { order_number: 'desc' },
        select: { order_number: true },
      });
      const sequence = (latest ? orderNumberSequence(latest.order_number, prefix) : 0) + 1;

      return tx.order.create({
        data: {
          order_number: generateOrderNumber(sequence, prefix),
          user_id: dto.user_id,
          total_amount: total,
          delivery_method: dto.delivery_method,
          shipping_fee: fee,
          shipping_address: dto.shipping_address ?? null,
          payment_slip: dto.payment_slip ?? null,
          payment_status: dto.payment_slip ? 'waiting_verify' : 'pending',
          order_status: 'pending',
          pickup_code: dto.delivery_method === 'pickup' ? generatePickupCode() : null,
          order_items: { create: itemData },
        },
        include: ORDER_INCLUDE,
      });
    });

    return { message: 'สร้างคำสั่งซื้อสำเร็จ', data: order };
  }

  async updatePaymentStatus(order_id: number, dto: UpdatePaymentStatusDto) {
    const order = await this.prisma.order.update({
      where: { order_id },
      data: {
        payment_status: dto.payment_status,
        // จ่ายเงินแล้วถือว่ายืนยันคำสั่งซื้อ
        ...(dto.payment_status === 'paid' ? { order_status: 'confirmed' } : {}),
      },
      include: ORDER_INCLUDE,
    });

    return { message: 'อัปเดตสถานะการชำระเงินสำเร็จ', data: order };
  }

  async updateOrderStatus(order_id: number, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.update({
      where: { order_id },
      data: { order_status: dto.order_status },
      include: ORDER_INCLUDE,
    });

    return { message: 'อัปเดตสถานะคำสั่งซื้อสำเร็จ', data: order };
  }

  /**
   * บันทึกบริษัทขนส่งและเลขพัสดุ (เฉพาะออร์เดอร์แบบจัดส่ง)
   *
   * ใส่เลขพัสดุครั้งแรก = ของออกจากร้านแล้ว จึงบันทึก shipped_at และเลื่อนสถานะเป็น shipped ให้เลย
   * (ส่ง mark_shipped: false ถ้ายังไม่อยากให้เปลี่ยนสถานะ)
   * ส่งค่าว่างมาทั้งคู่ = ล้างข้อมูลจัดส่งทิ้ง กรณีกรอกผิด
   */
  async updateShipping(order_id: number, dto: UpdateShippingDto) {
    const current = await this.prisma.order.findUnique({ where: { order_id } });
    if (!current) throw new NotFoundException('ไม่พบคำสั่งซื้อ');

    if (current.delivery_method !== 'delivery') {
      throw new UnprocessableEntityException(
        'คำสั่งซื้อนี้เป็นแบบรับที่สาขา ไม่ต้องใส่เลขพัสดุ — ใช้รหัสรับสินค้าที่จุดรับแทน',
      );
    }

    const carrier = dto.shipping_carrier?.trim() ?? current.shipping_carrier ?? '';
    const tracking = dto.tracking_number?.trim() ?? current.tracking_number ?? '';

    // มีเลขพัสดุต้องมีชื่อขนส่งด้วย ไม่งั้นลูกค้าไม่รู้จะไปเช็คที่เว็บไหน
    if (tracking && !carrier) {
      throw new UnprocessableEntityException('ต้องเลือกบริษัทขนส่งด้วย ไม่งั้นลูกค้าเช็คพัสดุไม่ได้');
    }

    const clearing = !carrier && !tracking;
    const firstTime = Boolean(tracking) && !current.tracking_number;
    const markShipped = dto.mark_shipped ?? true;

    // เลื่อนเป็น shipped เฉพาะออร์เดอร์ที่ยังไม่จบและไม่ได้ถูกยกเลิก
    const movable = !['completed', 'cancelled', 'shipped'].includes(current.order_status ?? '');
    const nextStatus = firstTime && markShipped && movable ? 'shipped' : undefined;

    const order = await this.prisma.order.update({
      where: { order_id },
      data: {
        shipping_carrier: clearing ? null : carrier || null,
        tracking_number: clearing ? null : tracking || null,
        shipped_at: clearing ? null : firstTime ? new Date() : current.shipped_at,
        ...(nextStatus ? { order_status: nextStatus } : {}),
      },
      include: ORDER_INCLUDE,
    });

    return {
      message: clearing
        ? 'ล้างข้อมูลการจัดส่งแล้ว'
        : nextStatus
          ? 'บันทึกเลขพัสดุและเปลี่ยนสถานะเป็น จัดส่งแล้ว'
          : 'บันทึกข้อมูลการจัดส่งสำเร็จ',
      data: order,
    };
  }

  async uploadSlip(order_id: number, dto: UploadSlipDto) {
    const order = await this.prisma.order.update({
      where: { order_id },
      data: { payment_slip: dto.payment_slip, payment_status: 'waiting_verify' },
      include: ORDER_INCLUDE,
    });

    return { message: 'แนบสลิปการชำระเงินสำเร็จ', data: order };
  }

  /**
   * ลบคำสั่งซื้อ
   *
   * กฎสำคัญเรื่องสต็อก:
   * - ถ้าคำสั่งซื้อยัง "ไม่ได้ส่งมอบ" (order_status != completed) ของยังอยู่ในร้าน
   *   การลบคือการยกเลิก จึงต้องคืนสต็อกให้ทุกรายการ
   * - ถ้าคำสั่งซื้อ "รับสินค้าไปแล้ว" (completed) ของออกจากร้านไปแล้วจริง
   *   ห้ามคืนสต็อก ไม่งั้นจำนวนคงเหลือจะเพิ่มขึ้นเองทั้งที่สินค้าไม่ได้กลับมา
   *   การลบกรณีนี้คือการล้างประวัติ (pickup_logs และ order_items ถูกลบตาม onDelete: Cascade)
   */
  async remove(order_id: number) {
    let restocked = false;

    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { order_id },
        include: { order_items: true },
      });
      if (!order) throw new NotFoundException('ไม่พบคำสั่งซื้อ');

      restocked = order.order_status !== 'completed';

      if (restocked) {
        for (const item of order.order_items) {
          await tx.productVariant.update({
            where: { variant_id: item.variant_id },
            data: { stock_quantity: { increment: item.quantity } },
          });
        }
      }

      await tx.order.delete({ where: { order_id } });
    });

    return {
      message: restocked
        ? 'ลบคำสั่งซื้อและคืนสต็อกสำเร็จ'
        : 'ลบคำสั่งซื้อที่ส่งมอบแล้วสำเร็จ (ไม่คืนสต็อกเพราะสินค้าออกจากร้านไปแล้ว)',
      data: { order_id, stock_restored: restocked },
    };
  }

  async summary() {
    const [totalOrders, paidAgg, byOrderStatus, byPaymentStatus] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        _sum: { total_amount: true },
        where: { payment_status: 'paid' },
      }),
      this.prisma.order.groupBy({ by: ['order_status'], _count: { order_status: true } }),
      this.prisma.order.groupBy({ by: ['payment_status'], _count: { payment_status: true } }),
    ]);

    return {
      message: 'ดึงสรุปยอดคำสั่งซื้อสำเร็จ',
      data: {
        total_orders: totalOrders,
        total_revenue_paid: Number(paidAgg._sum.total_amount ?? 0),
        by_order_status: byOrderStatus.map((r) => ({
          status: r.order_status,
          count: r._count.order_status,
        })),
        by_payment_status: byPaymentStatus.map((r) => ({
          status: r.payment_status,
          count: r._count.payment_status,
        })),
      },
    };
  }
}
