import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

/**
 * Prisma 7 + driver adapter (PrismaPg) ตาม tech-stack.md ข้อ 1.3
 *
 * ไม่ $connect() ตอนเริ่มระบบ — Prisma ต่อฐานข้อมูลเองเมื่อมีคำสั่งแรก
 * ทำให้สร้าง openapi.json ได้โดยไม่ต้องมีฐานข้อมูล (CI job API Contract Sync)
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
