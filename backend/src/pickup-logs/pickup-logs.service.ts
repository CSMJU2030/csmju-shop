import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { OrderStatus, PaymentStatus } from '../../generated/prisma/enums';
import type { CoreHubIdentity } from '../auth/core-hub-identity';
import { ApiError } from '../common/api-error';
import { deleted, Paginated } from '../common/envelope';
import { skipOf } from '../common/pagination-query.dto';
import { ORDER_INCLUDE } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePickupLogDto,
  CreatePickupVerificationDto,
  QueryPickupLogDto,
} from './dto/pickup-log.dto';

const LOG_INCLUDE = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      pickupCode: true,
      orderStatus: true,
      paymentStatus: true,
      recipientName: true,
      customerEmail: true,
    },
  },
} satisfies Prisma.PickupLogInclude;

@Injectable()
export class PickupLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryPickupLogDto) {
    const where: Prisma.PickupLogWhereInput = {
      ...(query.orderId ? { orderId: query.orderId } : {}),
      ...(query.staffCoreUserId ? { staffCoreUserId: query.staffCoreUserId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.pickupLog.findMany({
        where,
        skip: skipOf(query),
        take: query.limit,
        orderBy: [{ pickupTime: 'desc' }, { id: 'asc' }],
        include: LOG_INCLUDE,
      }),
      this.prisma.pickupLog.count({ where }),
    ]);
    return Paginated.of(rows, total, query.page, query.limit);
  }

  async findOne(id: string) {
    const log = await this.prisma.pickupLog.findUnique({ where: { id }, include: LOG_INCLUDE });
    if (!log) throw new ApiError('NOT_FOUND', 'ไม่พบบันทึกการรับสินค้า');
    return log;
  }

  /** ตรวจรหัสรับสินค้าก่อนส่งมอบจริง — ใช้ตอนลูกค้ามาถึงจุดรับ */
  async verify(dto: CreatePickupVerificationDto) {
    const order = await this.prisma.order.findUnique({
      where: { pickupCode: dto.pickupCode.trim() },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new ApiError('NOT_FOUND', 'รหัสรับสินค้าไม่ถูกต้อง');

    const alreadyPickedUp = order.pickupLogs.length > 0;
    return {
      valid:
        order.paymentStatus === PaymentStatus.PAID &&
        order.orderStatus !== OrderStatus.CANCELLED &&
        !alreadyPickedUp,
      alreadyPickedUp,
      order,
    };
  }

  /**
   * บันทึกการส่งมอบสินค้า
   * - คำสั่งซื้อต้องชำระเงินแล้ว ยังไม่ถูกยกเลิก และยังไม่เคยรับ
   * - สำเร็จแล้วปิดคำสั่งซื้อเป็น COMPLETED
   */
  async create(staff: CoreHubIdentity, dto: CreatePickupLogDto) {
    if (!dto.orderId && !dto.pickupCode) {
      throw new ApiError('VALIDATION_ERROR', 'ต้องระบุ orderId หรือ pickupCode อย่างใดอย่างหนึ่ง', [
        'orderId or pickupCode is required',
      ]);
    }

    return this.prisma.$transaction(async (tx) => {
      const order = dto.orderId
        ? await tx.order.findUnique({ where: { id: dto.orderId } })
        : await tx.order.findUnique({ where: { pickupCode: dto.pickupCode!.trim() } });
      if (!order) throw new ApiError('NOT_FOUND', 'ไม่พบคำสั่งซื้อ');

      if (order.deliveryMethod !== 'PICKUP') {
        throw new ApiError('CONFLICT', 'คำสั่งซื้อนี้เป็นแบบจัดส่ง ไม่ได้รับที่สาขา');
      }
      if (order.paymentStatus !== PaymentStatus.PAID) {
        throw new ApiError('CONFLICT', 'คำสั่งซื้อนี้ยังไม่ได้ยืนยันการชำระเงิน');
      }
      if (order.orderStatus === OrderStatus.CANCELLED) {
        throw new ApiError('CONFLICT', 'คำสั่งซื้อนี้ถูกยกเลิกแล้ว');
      }
      const existing = await tx.pickupLog.count({ where: { orderId: order.id } });
      if (existing > 0 || order.orderStatus === OrderStatus.COMPLETED) {
        throw new ApiError('CONFLICT', 'คำสั่งซื้อนี้รับสินค้าไปแล้ว');
      }

      const created = await tx.pickupLog.create({
        data: {
          orderId: order.id,
          staffCoreUserId: staff.coreUserId,
          staffEmail: staff.email,
          notes: dto.notes?.trim() || null,
        },
        include: LOG_INCLUDE,
      });
      await tx.order.update({
        where: { id: order.id },
        data: { orderStatus: OrderStatus.COMPLETED },
      });
      return { ...created, order: { ...created.order, orderStatus: OrderStatus.COMPLETED } };
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.pickupLog.delete({ where: { id } });
    return deleted(id);
  }
}
