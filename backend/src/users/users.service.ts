import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { buildMeta } from '../common/utils/helpers.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { QueryUserDto } from './dto/query-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryUserDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.search
        ? {
            OR: [
              { fullname: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { student_id: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: query.skip,
        take: limit,
        orderBy: { user_id: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { message: 'ดึงรายการผู้ใช้สำเร็จ', data: rows, meta: buildMeta(page, limit, total) };
  }

  async findOne(user_id: number) {
    const user = await this.prisma.user.findUnique({
      where: { user_id },
      include: {
        orders: { orderBy: { order_id: 'desc' }, take: 10 },
        _count: { select: { orders: true, pickup_logs: true } },
      },
    });
    if (!user) throw new NotFoundException('ไม่พบผู้ใช้');

    return { message: 'ดึงข้อมูลผู้ใช้สำเร็จ', data: user };
  }

  async create(dto: CreateUserDto) {
    const user = await this.prisma.user.create({
      data: {
        student_id: dto.student_id ?? null,
        fullname: dto.fullname,
        email: dto.email,
        phone: dto.phone,
        role: dto.role ?? 'customer',
      },
    });

    return { message: 'สร้างผู้ใช้สำเร็จ', data: user };
  }

  async update(user_id: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { user_id },
      data: {
        ...(dto.student_id !== undefined ? { student_id: dto.student_id || null } : {}),
        ...(dto.fullname !== undefined ? { fullname: dto.fullname } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
      },
    });

    return { message: 'แก้ไขผู้ใช้สำเร็จ', data: user };
  }

  async remove(user_id: number) {
    const orderCount = await this.prisma.order.count({ where: { user_id } });
    if (orderCount > 0) {
      throw new ConflictException(`ลบไม่ได้ ผู้ใช้นี้มีคำสั่งซื้ออยู่ ${orderCount} รายการ`);
    }

    await this.prisma.user.delete({ where: { user_id } });
    return { message: 'ลบผู้ใช้สำเร็จ', data: { user_id } };
  }
}
