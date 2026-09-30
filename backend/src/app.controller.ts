import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  /** GET / — ข้อมูล API (ไม่อยู่ใต้ prefix /api) */
  @Get()
  root() {
    return {
      message: 'CSMJU-Shop API',
      data: {
        name: 'CSMJU-Shop API',
        version: '1.0.0',
        framework: 'NestJS',
        docs: 'ดูรายละเอียด endpoint ทั้งหมดได้ที่ไฟล์ API.md',
        base_url: '/api',
        endpoints: [
          'GET    /api/health',
          'CRUD   /api/users',
          'CRUD   /api/products',
          'CRUD   /api/variants',
          'CRUD   /api/orders',
          'CRUD   /api/order-items',
          'CRUD   /api/pickup-logs',
        ],
      },
    };
  }

  /** GET /api/health — ตรวจว่าเชื่อมต่อฐานข้อมูลได้ */
  @Get('health')
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      throw new ServiceUnavailableException('เชื่อมต่อฐานข้อมูลไม่ได้');
    }
    return {
      message: 'CSMJU-Shop API พร้อมใช้งาน',
      data: {
        database: 'connected',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
