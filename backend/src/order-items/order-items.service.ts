import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { OrderStatus } from '../../generated/prisma/enums';
import type { CoreHubIdentity } from '../auth/core-hub-identity';
import { assertOwnerOrAny } from '../auth/ownership';
import { Permission } from '../auth/permissions';
import { ApiError } from '../common/api-error';
import { deleted, Paginated } from '../common/envelope';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderItemDto, UpdateOrderItemDto } from './dto/order-item.dto';

const ITEM_INCLUDE = {
  variant: {
    select: {
      id: true,
      variantName: true,
      product: { select: { id: true, name: true, category: true, isPreorder: true } },
    },
  },
} satisfies Prisma.OrderItemInclude;

/** แก้รายการสินค้าได้เฉพาะคำสั่งซื้อที่ยังไม่เริ่มจัดส่ง/ส่งมอบ */
const EDITABLE: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING];

@Injectable()
export class OrderItemsService {
  constructor(private readonly prisma: PrismaService) {}

  /** คำนวณยอดรวมใหม่จากรายการสินค้า + ค่าจัดส่ง */
  private async recalcTotal(tx: Prisma.TransactionClient, orderId: string) {
    const [items, order] = await Promise.all([
      tx.orderItem.findMany({ where: { orderId } }),
      tx.order.findUniqueOrThrow({ where: { id: orderId } }),
    ]);
    const subtotal = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
    await tx.order.update({
      where: { id: orderId },
      data: { totalAmount: subtotal + order.shippingFee },
    });
  }

  private assertEditable(status: OrderStatus) {
    if (!EDITABLE.includes(status)) {
      throw new ApiError('CONFLICT', 'แก้รายการสินค้าได้เฉพาะคำสั่งซื้อที่ยังไม่จัดส่งหรือส่งมอบ');
    }
  }

  async findByOrder(user: CoreHubIdentity, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new ApiError('NOT_FOUND', 'ไม่พบคำสั่งซื้อ');
    assertOwnerOrAny(user, order.coreUserId, Permission.ORDER_READ_ANY);

    const rows = await this.prisma.orderItem.findMany({
      where: { orderId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: ITEM_INCLUDE,
    });
    return Paginated.of(rows, rows.length, 1, Math.max(rows.length, 1));
  }

  async findOne(user: CoreHubIdentity, id: string) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id },
      include: { ...ITEM_INCLUDE, order: { select: { coreUserId: true } } },
    });
    if (!item) throw new ApiError('NOT_FOUND', 'ไม่พบรายการสินค้า');
    assertOwnerOrAny(user, item.order.coreUserId, Permission.ORDER_READ_ANY);
    const { order: _owner, ...rest } = item;
    void _owner;
    return rest;
  }

  /** เพิ่มสินค้าเข้าคำสั่งซื้อเดิม — ตัดสต็อกและคำนวณยอดใหม่ */
  async create(orderId: string, dto: CreateOrderItemDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new ApiError('NOT_FOUND', 'ไม่พบคำสั่งซื้อ');
      this.assertEditable(order.orderStatus);

      const variant = await tx.productVariant.findUnique({
        where: { id: dto.variantId },
        include: { product: true },
      });
      if (!variant) throw new ApiError('NOT_FOUND', 'ไม่พบตัวเลือกสินค้า (variantId)');

      const isPreorder = variant.product.isPreorder;
      if (isPreorder) {
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stockQuantity: { decrement: dto.quantity } },
        });
      } else {
        const result = await tx.productVariant.updateMany({
          where: { id: variant.id, stockQuantity: { gte: dto.quantity } },
          data: { stockQuantity: { decrement: dto.quantity } },
        });
        if (result.count === 0) {
          throw new ApiError(
            'CONFLICT',
            `สต็อกไม่พอ (คงเหลือ ${variant.stockQuantity}, ต้องการ ${dto.quantity})`,
          );
        }
      }

      const created = await tx.orderItem.create({
        data: {
          orderId,
          variantId: variant.id,
          quantity: dto.quantity,
          unitPrice: variant.price,
          isPreorderItem: isPreorder,
        },
        include: ITEM_INCLUDE,
      });
      await this.recalcTotal(tx, orderId);
      return created;
    });
  }

  /** แก้จำนวน — ปรับสต็อกตามส่วนต่างและคำนวณยอดใหม่ */
  async update(id: string, dto: UpdateOrderItemDto) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findUnique({
        where: { id },
        include: { order: true, variant: { include: { product: true } } },
      });
      if (!item) throw new ApiError('NOT_FOUND', 'ไม่พบรายการสินค้า');
      this.assertEditable(item.order.orderStatus);

      const diff = dto.quantity - item.quantity;
      if (diff > 0 && !item.variant.product.isPreorder) {
        const result = await tx.productVariant.updateMany({
          where: { id: item.variantId, stockQuantity: { gte: diff } },
          data: { stockQuantity: { decrement: diff } },
        });
        if (result.count === 0) {
          throw new ApiError(
            'CONFLICT',
            `สต็อกไม่พอ (คงเหลือ ${item.variant.stockQuantity}, ต้องการเพิ่ม ${diff})`,
          );
        }
      } else if (diff !== 0) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { decrement: diff } },
        });
      }

      const result = await tx.orderItem.update({
        where: { id },
        data: { quantity: dto.quantity },
        include: ITEM_INCLUDE,
      });
      await this.recalcTotal(tx, item.orderId);
      return result;
    });
  }

  /** ลบรายการ — คืนสต็อกและคำนวณยอดใหม่ (ต้องเหลืออย่างน้อย 1 รายการ) */
  async remove(id: string) {
    await this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findUnique({ where: { id }, include: { order: true } });
      if (!item) throw new ApiError('NOT_FOUND', 'ไม่พบรายการสินค้า');
      this.assertEditable(item.order.orderStatus);

      const remaining = await tx.orderItem.count({ where: { orderId: item.orderId } });
      if (remaining <= 1) {
        throw new ApiError(
          'CONFLICT',
          'คำสั่งซื้อต้องมีสินค้าอย่างน้อย 1 รายการ — ถ้าจะยกเลิกให้เปลี่ยนสถานะเป็น CANCELLED',
        );
      }

      await tx.orderItem.delete({ where: { id } });
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stockQuantity: { increment: item.quantity } },
      });
      await this.recalcTotal(tx, item.orderId);
    });
    return deleted(id);
  }
}
