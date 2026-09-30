import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { buildMeta } from '../common/utils/helpers.js';
import {
  CreatePickupLogDto,
  QueryPickupLogDto,
  VerifyPickupCodeDto,
} from './dto/pickup-log.dto.js';

const LOG_INCLUDE = {
  order: {
    select: {
      order_id: true,
      order_number: true,
      pickup_code: true,
      order_status: true,
      payment_status: true,
      user: { select: { user_id: true, fullname: true, student_id: true } },
    },
  },
  staff: { select: { user_id: true, fullname: true, role: true } },
} satisfies Prisma.PickupLogInclude;

@Injectable()
export class PickupLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryPickupLogDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.PickupLogWhereInput = {
      ...(query.order_id ? { order_id: query.order_id } : {}),
      ...(query.staff_id ? { staff_id: query.staff_id } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.pickupLog.findMany({
        where,
        skip: query.skip,
        take: limit,
        orderBy: { pickup_id: 'desc' },
        include: LOG_INCLUDE,
      }),
      this.prisma.pickupLog.count({ where }),
    ]);

    return {
      message: 'ดึงประวัติการรับสินค้าสำเร็จ',
      data: rows,
      meta: buildMeta(page, limit, total),
    };
  }

  async findOne(pickup_id: number) {
    const log = await this.prisma.pickupLog.findUnique({
      where: { pickup_id },
      include: LOG_INCLUDE,
    });
    if (!log) throw new NotFoundException('ไม่พบบันทึกการรับสินค้า');

    return { message: 'ดึงข้อมูลการรับสินค้าสำเร็จ', data: log };
  }

  /** ตรวจรหัสรับสินค้าก่อนส่งมอบจริง — ใช้ตอนลูกค้ามาถึงหน้าร้าน */
  async verify(dto: VerifyPickupCodeDto) {
    const order = await this.prisma.order.findUnique({
      where: { pickup_code: dto.pickup_code },
      include: {
        user: { select: { user_id: true, fullname: true, student_id: true, phone: true } },
        order_items: {
          include: { variant: { include: { product: { select: { name: true } } } } },
        },
        pickup_logs: true,
      },
    });
    if (!order) throw new NotFoundException('รหัสรับสินค้าไม่ถูกต้อง');

    return {
      message: 'ตรวจสอบรหัสรับสินค้าสำเร็จ',
      data: {
        valid: order.payment_status === 'paid' && order.order_status !== 'cancelled',
        already_picked_up: order.pickup_logs.length > 0,
        order,
      },
    };
  }

  /**
   * บันทึกการส่งมอบสินค้า
   * - ผู้บันทึกต้องเป็น staff หรือ admin
   * - ออร์เดอร์ต้องชำระเงินแล้วและยังไม่ถูกยกเลิก
   * - บันทึกสำเร็จแล้วปิดออร์เดอร์เป็น completed
   */
  async create(dto: CreatePickupLogDto) {
    if (!dto.order_id && !dto.pickup_code) {
      throw new UnprocessableEntityException(
        'ต้องระบุ order_id หรือ pickup_code อย่างใดอย่างหนึ่ง',
      );
    }

    const log = await this.prisma.$transaction(async (tx) => {
      const staff = await tx.user.findUnique({ where: { user_id: dto.staff_id } });
      if (!staff) throw new NotFoundException('ไม่พบผู้ใช้ (staff_id)');
      if (!['staff', 'admin'].includes(staff.role ?? '')) {
        throw new ForbiddenException('ผู้บันทึกต้องมี role เป็น staff หรือ admin เท่านั้น');
      }

      const order = dto.order_id
        ? await tx.order.findUnique({ where: { order_id: dto.order_id } })
        : await tx.order.findUnique({ where: { pickup_code: dto.pickup_code! } });
      if (!order) throw new NotFoundException('ไม่พบคำสั่งซื้อ');

      if (order.payment_status !== 'paid') {
        throw new ConflictException(
          `คำสั่งซื้อนี้ยังไม่ชำระเงิน (payment_status = ${order.payment_status})`,
        );
      }
      if (order.order_status === 'cancelled') {
        throw new ConflictException('คำสั่งซื้อนี้ถูกยกเลิกแล้ว');
      }

      const created = await tx.pickupLog.create({
        data: {
          order_id: order.order_id,
          staff_id: dto.staff_id,
          notes: dto.notes ?? null,
        },
        include: LOG_INCLUDE,
      });

      await tx.order.update({
        where: { order_id: order.order_id },
        data: { order_status: 'completed' },
      });

      return created;
    });

    return { message: 'บันทึกการรับสินค้าสำเร็จ', data: log };
  }

  async remove(pickup_id: number) {
    await this.prisma.pickupLog.delete({ where: { pickup_id } });
    return { message: 'ลบบันทึกการรับสินค้าสำเร็จ', data: { pickup_id } };
  }
}
