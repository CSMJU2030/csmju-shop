import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderItemDto, UpdateOrderItemDto } from './dto/order-item.dto.js';

const ITEM_INCLUDE = {
  variant: {
    include: { product: { select: { product_id: true, name: true, category: true } } },
  },
} satisfies Prisma.OrderItemInclude;

@Injectable()
export class OrderItemsService {
  constructor(private readonly prisma: PrismaService) {}

  /** คำนวณยอดรวมของออร์เดอร์ใหม่จาก order_items + ค่าจัดส่ง */
  private async recalcTotal(tx: Prisma.TransactionClient, order_id: number) {
    const [items, order] = await Promise.all([
      tx.orderItem.findMany({ where: { order_id } }),
      tx.order.findUnique({ where: { order_id } }),
    ]);
    if (!order) return;

    const subtotal = items.reduce((sum, it) => sum + Number(it.unit_price) * it.quantity, 0);
    const total = Number((subtotal + Number(order.shipping_fee ?? 0)).toFixed(2));

    await tx.order.update({ where: { order_id }, data: { total_amount: total } });
  }

  async findByOrder(order_id: number) {
    const order = await this.prisma.order.findUnique({ where: { order_id } });
    if (!order) throw new NotFoundException('ไม่พบคำสั่งซื้อ');

    const rows = await this.prisma.orderItem.findMany({
      where: { order_id },
      orderBy: { item_id: 'asc' },
      include: ITEM_INCLUDE,
    });

    return { message: 'ดึงรายการสินค้าในคำสั่งซื้อสำเร็จ', data: rows };
  }

  async findOne(item_id: number) {
    const item = await this.prisma.orderItem.findUnique({
      where: { item_id },
      include: ITEM_INCLUDE,
    });
    if (!item) throw new NotFoundException('ไม่พบรายการสินค้า');

    return { message: 'ดึงข้อมูลรายการสินค้าสำเร็จ', data: item };
  }

  /** เพิ่มสินค้าเข้าออร์เดอร์เดิม — ตัดสต็อกและคำนวณยอดใหม่ */
  async create(order_id: number, dto: CreateOrderItemDto) {
    const item = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { order_id } });
      if (!order) throw new NotFoundException('ไม่พบคำสั่งซื้อ');

      const variant = await tx.productVariant.findUnique({
        where: { variant_id: dto.variant_id },
        include: { product: true },
      });
      if (!variant) throw new NotFoundException('ไม่พบตัวเลือกสินค้า (variant_id)');

      const isPreorder = variant.product.is_preorder === true;
      if (!isPreorder && (variant.stock_quantity ?? 0) < dto.quantity) {
        throw new ConflictException(
          `สต็อกไม่พอ (คงเหลือ ${variant.stock_quantity ?? 0}, ต้องการ ${dto.quantity})`,
        );
      }

      const created = await tx.orderItem.create({
        data: {
          order_id,
          variant_id: variant.variant_id,
          quantity: dto.quantity,
          unit_price: Number(variant.price),
          is_preorder_item: isPreorder,
        },
        include: ITEM_INCLUDE,
      });

      await tx.productVariant.update({
        where: { variant_id: variant.variant_id },
        data: { stock_quantity: { decrement: dto.quantity } },
      });

      await this.recalcTotal(tx, order_id);
      return created;
    });

    return { message: 'เพิ่มรายการสินค้าสำเร็จ', data: item };
  }

  /** แก้จำนวน — ปรับสต็อกตามส่วนต่างและคำนวณยอดใหม่ */
  async update(item_id: number, dto: UpdateOrderItemDto) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findUnique({
        where: { item_id },
        include: { variant: { include: { product: true } } },
      });
      if (!item) throw new NotFoundException('ไม่พบรายการสินค้า');

      const diff = dto.quantity - item.quantity;
      const isPreorder = item.variant.product.is_preorder === true;

      if (diff > 0 && !isPreorder && (item.variant.stock_quantity ?? 0) < diff) {
        throw new ConflictException(
          `สต็อกไม่พอ (คงเหลือ ${item.variant.stock_quantity ?? 0}, ต้องการเพิ่ม ${diff})`,
        );
      }

      const result = await tx.orderItem.update({
        where: { item_id },
        data: { quantity: dto.quantity },
        include: ITEM_INCLUDE,
      });

      if (diff !== 0) {
        await tx.productVariant.update({
          where: { variant_id: item.variant_id },
          data: { stock_quantity: { decrement: diff } },
        });
      }

      await this.recalcTotal(tx, item.order_id);
      return result;
    });

    return { message: 'แก้ไขรายการสินค้าสำเร็จ', data: updated };
  }

  /** ลบรายการ — คืนสต็อกและคำนวณยอดใหม่ */
  async remove(item_id: number) {
    await this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findUnique({ where: { item_id } });
      if (!item) throw new NotFoundException('ไม่พบรายการสินค้า');

      await tx.orderItem.delete({ where: { item_id } });
      await tx.productVariant.update({
        where: { variant_id: item.variant_id },
        data: { stock_quantity: { increment: item.quantity } },
      });

      await this.recalcTotal(tx, item.order_id);
    });

    return { message: 'ลบรายการสินค้าและคืนสต็อกสำเร็จ', data: { item_id } };
  }
}
