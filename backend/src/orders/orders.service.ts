import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { OrderStatus, PaymentStatus } from '../../generated/prisma/enums';
import type { CoreHubIdentity } from '../auth/core-hub-identity';
import { assertOwnerOrAny, canAny } from '../auth/ownership';
import { Permission } from '../auth/permissions';
import { ApiError } from '../common/api-error';
import { deleted, Paginated } from '../common/envelope';
import { skipOf } from '../common/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  formatOrderNumber,
  generatePickupCode,
  orderNumberPrefix,
  orderNumberSequence,
  shippingFeeSatang,
} from '../shop/shop.constants';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import {
  UpdateOrderStatusDto,
  UpdatePaymentSlipDto,
  UpdatePaymentStatusDto,
  UpdateShippingDto,
} from './dto/update-order.dto';

/** ข้อมูลที่แนบไปกับคำสั่งซื้อทุกครั้ง */
export const ORDER_INCLUDE = {
  orderItems: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: {
      variant: {
        select: {
          id: true,
          variantName: true,
          product: {
            select: { id: true, name: true, category: true, isPreorder: true, imageUrl: true },
          },
        },
      },
    },
  },
  pickupLogs: { orderBy: [{ pickupTime: 'desc' }, { id: 'asc' }] },
} satisfies Prisma.OrderInclude;

/** สถานะที่ถือว่าจบแล้ว — เปลี่ยนต่อไม่ได้ */
const FINAL_STATUSES: OrderStatus[] = [OrderStatus.COMPLETED, OrderStatus.CANCELLED];

function isUniqueViolation(error: unknown): boolean {
  return !!error && typeof error === 'object' && (error as { code?: unknown }).code === 'P2002';
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: CoreHubIdentity, query: QueryOrderDto) {
    // มีแค่ :own → เห็นเฉพาะของตัวเองเสมอ ไม่ว่าจะส่ง query อะไรมา
    const onlyMine = query.mine === true || !canAny(user, Permission.ORDER_READ_ANY);

    const where: Prisma.OrderWhereInput = {
      ...(onlyMine ? { coreUserId: user.coreUserId } : {}),
      ...(query.orderStatus ? { orderStatus: query.orderStatus } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...(query.deliveryMethod ? { deliveryMethod: query.deliveryMethod } : {}),
      ...(query.orderNumber ? { orderNumber: query.orderNumber } : {}),
      ...(query.search
        ? {
            OR: [
              { orderNumber: { contains: query.search, mode: 'insensitive' } },
              { pickupCode: { contains: query.search, mode: 'insensitive' } },
              { trackingNumber: { contains: query.search, mode: 'insensitive' } },
              { recipientName: { contains: query.search, mode: 'insensitive' } },
              { customerEmail: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: skipOf(query),
        take: query.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: ORDER_INCLUDE,
      }),
      this.prisma.order.count({ where }),
    ]);
    return Paginated.of(rows, total, query.page, query.limit);
  }

  async findOne(user: CoreHubIdentity, id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order) throw new ApiError('NOT_FOUND', 'ไม่พบคำสั่งซื้อ');
    assertOwnerOrAny(user, order.coreUserId, Permission.ORDER_READ_ANY);
    return order;
  }

  /**
   * สร้างคำสั่งซื้อ — ทุกขั้นอยู่ใน transaction เดียว
   * ตรวจสินค้า → ตัดสต็อกแบบมีเงื่อนไข (กันขายเกิน) → คำนวณยอด → ออกเลขที่และรหัสรับ
   *
   * ลองใหม่สูงสุด 3 ครั้งเมื่อเลขที่คำสั่งซื้อ/รหัสรับชน (สองคนกดสั่งพร้อมกัน)
   */
  async create(user: CoreHubIdentity, dto: CreateOrderDto) {
    const shippingAddress = dto.shippingAddress?.trim() || null;
    if (dto.deliveryMethod === 'DELIVERY' && !shippingAddress) {
      throw new ApiError('VALIDATION_ERROR', 'การจัดส่งต้องระบุที่อยู่ (shippingAddress)', [
        'shippingAddress is required when deliveryMethod is DELIVERY',
      ]);
    }

    // รวมรายการที่เป็นตัวเลือกเดียวกัน
    const quantities = new Map<string, number>();
    for (const item of dto.items) {
      quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
    }

    for (let attempt = 1; ; attempt++) {
      try {
        return await this.createOnce(user, dto, shippingAddress, quantities);
      } catch (error) {
        if (!(isUniqueViolation(error) && attempt < 3)) throw error;
      }
    }
  }

  private async createOnce(
    user: CoreHubIdentity,
    dto: CreateOrderDto,
    shippingAddress: string | null,
    quantities: Map<string, number>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const variantIds = [...quantities.keys()];
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: { product: true },
      });
      if (variants.length !== variantIds.length) {
        throw new ApiError('NOT_FOUND', 'มีตัวเลือกสินค้าที่ไม่มีอยู่จริงในตะกร้า');
      }

      const now = new Date();
      let subtotal = 0;
      const itemData: Prisma.OrderItemCreateWithoutOrderInput[] = [];

      for (const variant of variants) {
        const quantity = quantities.get(variant.id) ?? 0;
        const isPreorder = variant.product.isPreorder;
        const label = `"${variant.product.name} - ${variant.variantName}"`;

        if (
          isPreorder &&
          variant.product.preorderEndDate &&
          variant.product.preorderEndDate < now
        ) {
          throw new ApiError('CONFLICT', `ปิดรับพรีออเดอร์ ${label} แล้ว`);
        }

        if (isPreorder) {
          // สินค้าพรีออเดอร์สั่งได้แม้สต็อกเป็น 0 (สต็อกติดลบ = ยอดที่ต้องสั่งผลิตเพิ่ม)
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stockQuantity: { decrement: quantity } },
          });
        } else {
          // ตัดสต็อกแบบมีเงื่อนไขในคำสั่งเดียว กันสองคำสั่งซื้อแย่งของชิ้นสุดท้าย
          const result = await tx.productVariant.updateMany({
            where: { id: variant.id, stockQuantity: { gte: quantity } },
            data: { stockQuantity: { decrement: quantity } },
          });
          if (result.count === 0) {
            throw new ApiError(
              'CONFLICT',
              `สต็อกไม่พอสำหรับ ${label} (คงเหลือ ${variant.stockQuantity}, ต้องการ ${quantity})`,
            );
          }
        }

        subtotal += variant.price * quantity;
        itemData.push({
          variant: { connect: { id: variant.id } },
          quantity,
          unitPrice: variant.price,
          isPreorderItem: isPreorder,
        });
      }

      const shippingFee = dto.deliveryMethod === 'DELIVERY' ? shippingFeeSatang() : 0;

      // เดินเลขต่อจาก "เลขที่สูงสุดของเดือนนี้" ไม่ใช่จากจำนวนแถว (ลบคำสั่งซื้อแล้วเลขจะไม่วนชนของเดิม)
      const prefix = orderNumberPrefix(now);
      const latest = await tx.order.findFirst({
        where: { orderNumber: { startsWith: prefix } },
        orderBy: { orderNumber: 'desc' },
        select: { orderNumber: true },
      });
      const sequence = (latest ? orderNumberSequence(latest.orderNumber, prefix) : 0) + 1;

      return tx.order.create({
        data: {
          orderNumber: formatOrderNumber(sequence, prefix),
          coreUserId: user.coreUserId,
          customerEmail: user.email,
          recipientName: dto.recipientName.trim(),
          recipientPhone: dto.recipientPhone,
          totalAmount: subtotal + shippingFee,
          deliveryMethod: dto.deliveryMethod,
          shippingFee,
          shippingAddress: dto.deliveryMethod === 'DELIVERY' ? shippingAddress : null,
          paymentSlip: dto.paymentSlip ?? null,
          paymentStatus: dto.paymentSlip ? PaymentStatus.WAITING_VERIFY : PaymentStatus.PENDING,
          orderStatus: OrderStatus.PENDING,
          pickupCode: dto.deliveryMethod === 'PICKUP' ? generatePickupCode() : null,
          orderItems: { create: itemData },
        },
        include: ORDER_INCLUDE,
      });
    });
  }

  async updatePaymentStatus(id: string, dto: UpdatePaymentStatusDto) {
    const current = await this.getOrThrow(id);
    if (current.orderStatus === OrderStatus.CANCELLED && dto.paymentStatus === PaymentStatus.PAID) {
      throw new ApiError('CONFLICT', 'คำสั่งซื้อนี้ถูกยกเลิกแล้ว ยืนยันการชำระเงินไม่ได้');
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        paymentStatus: dto.paymentStatus,
        // จ่ายเงินแล้วถือว่ายืนยันคำสั่งซื้อ
        ...(dto.paymentStatus === PaymentStatus.PAID && current.orderStatus === OrderStatus.PENDING
          ? { orderStatus: OrderStatus.CONFIRMED }
          : {}),
      },
      include: ORDER_INCLUDE,
    });
  }

  /**
   * เปลี่ยนสถานะคำสั่งซื้อ
   * - ยกเลิก (CANCELLED) = คืนสต็อกทุกรายการ
   * - คำสั่งซื้อที่จบแล้ว (COMPLETED / CANCELLED) เปลี่ยนต่อไม่ได้
   */
  async updateOrderStatus(id: string, dto: UpdateOrderStatusDto) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id }, include: { orderItems: true } });
      if (!current) throw new ApiError('NOT_FOUND', 'ไม่พบคำสั่งซื้อ');

      if (current.orderStatus === dto.orderStatus) {
        return tx.order.findUniqueOrThrow({ where: { id }, include: ORDER_INCLUDE });
      }
      if (FINAL_STATUSES.includes(current.orderStatus)) {
        throw new ApiError(
          'CONFLICT',
          `คำสั่งซื้อนี้${current.orderStatus === OrderStatus.CANCELLED ? 'ถูกยกเลิก' : 'ส่งมอบ'}แล้ว เปลี่ยนสถานะไม่ได้`,
        );
      }

      if (dto.orderStatus === OrderStatus.CANCELLED) {
        for (const item of current.orderItems) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
      }

      return tx.order.update({
        where: { id },
        data: { orderStatus: dto.orderStatus },
        include: ORDER_INCLUDE,
      });
    });
  }

  /**
   * บันทึกบริษัทขนส่งและเลขพัสดุ (เฉพาะคำสั่งซื้อแบบ DELIVERY)
   * ใส่เลขพัสดุครั้งแรก = ของออกจากร้านแล้ว → บันทึก shippedAt และเลื่อนเป็น SHIPPED
   * ส่งค่าว่างทั้งคู่ = ล้างข้อมูลการจัดส่ง
   */
  async updateShipping(id: string, dto: UpdateShippingDto) {
    const current = await this.getOrThrow(id);
    if (current.deliveryMethod !== 'DELIVERY') {
      throw new ApiError('CONFLICT', 'คำสั่งซื้อนี้เป็นแบบรับที่สาขา ไม่ต้องใส่เลขพัสดุ');
    }

    const carrier = dto.shippingCarrier?.trim() ?? current.shippingCarrier ?? '';
    const tracking = dto.trackingNumber?.trim() ?? current.trackingNumber ?? '';
    if (tracking && !carrier) {
      throw new ApiError(
        'VALIDATION_ERROR',
        'ต้องเลือกบริษัทขนส่งด้วย ไม่งั้นลูกค้าเช็คพัสดุไม่ได้',
        ['shippingCarrier is required when trackingNumber is set'],
      );
    }

    const clearing = !carrier && !tracking;
    const firstTime = Boolean(tracking) && !current.trackingNumber;
    const movable = !([...FINAL_STATUSES, OrderStatus.SHIPPED] as OrderStatus[]).includes(
      current.orderStatus,
    );
    const markShipped = firstTime && (dto.markShipped ?? true) && movable;

    return this.prisma.order.update({
      where: { id },
      data: {
        shippingCarrier: clearing ? null : carrier || null,
        trackingNumber: clearing ? null : tracking || null,
        shippedAt: clearing ? null : firstTime ? new Date() : current.shippedAt,
        ...(markShipped ? { orderStatus: OrderStatus.SHIPPED } : {}),
      },
      include: ORDER_INCLUDE,
    });
  }

  /** แนบสลิป — เจ้าของคำสั่งซื้อ หรือเจ้าหน้าที่ */
  async updatePaymentSlip(user: CoreHubIdentity, id: string, dto: UpdatePaymentSlipDto) {
    const current = await this.getOrThrow(id);
    assertOwnerOrAny(user, current.coreUserId, Permission.ORDER_UPDATE_ANY);

    if (current.orderStatus === OrderStatus.CANCELLED) {
      throw new ApiError('CONFLICT', 'คำสั่งซื้อนี้ถูกยกเลิกแล้ว');
    }
    if (
      current.paymentStatus === PaymentStatus.PAID ||
      current.paymentStatus === PaymentStatus.REFUNDED
    ) {
      throw new ApiError('CONFLICT', 'คำสั่งซื้อนี้ตรวจสอบการชำระเงินเรียบร้อยแล้ว');
    }

    return this.prisma.order.update({
      where: { id },
      data: { paymentSlip: dto.paymentSlip, paymentStatus: PaymentStatus.WAITING_VERIFY },
      include: ORDER_INCLUDE,
    });
  }

  /**
   * ลบคำสั่งซื้อ (ผู้ดูแล)
   * - ยังไม่ส่งมอบและยังไม่ถูกยกเลิก → ของยังอยู่ในร้าน จึงคืนสต็อก
   * - ส่งมอบแล้ว (COMPLETED) → ของออกจากร้านไปแล้ว ไม่คืนสต็อก
   * - ยกเลิกแล้ว (CANCELLED) → คืนสต็อกไปตอนยกเลิกแล้ว ไม่คืนซ้ำ
   */
  async remove(id: string) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, include: { orderItems: true } });
      if (!order) throw new ApiError('NOT_FOUND', 'ไม่พบคำสั่งซื้อ');

      if (!FINAL_STATUSES.includes(order.orderStatus)) {
        for (const item of order.orderItems) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
      }
      await tx.order.delete({ where: { id } });
    });
    return deleted(id);
  }

  private async getOrThrow(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new ApiError('NOT_FOUND', 'ไม่พบคำสั่งซื้อ');
    return order;
  }
}
