import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentStatus } from '../../generated/prisma/enums';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { ApiEnvelope } from '../common/api-envelope.decorator';
import { OrderStatsModel } from '../orders/order.model';

@Injectable()
export class OrderStatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** สรุปยอดคำสั่งซื้อ — ยอดเงินหน่วยสตางค์ */
  async summary() {
    const [totalOrders, paid, byOrderStatus, byPaymentStatus] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { paymentStatus: PaymentStatus.PAID },
      }),
      this.prisma.order.groupBy({
        by: ['orderStatus'],
        _count: { _all: true },
        orderBy: { orderStatus: 'asc' },
      }),
      this.prisma.order.groupBy({
        by: ['paymentStatus'],
        _count: { _all: true },
        orderBy: { paymentStatus: 'asc' },
      }),
    ]);

    return {
      totalOrders,
      paidRevenue: paid._sum.totalAmount ?? 0,
      byOrderStatus: byOrderStatus.map((r) => ({ status: r.orderStatus, count: r._count._all })),
      byPaymentStatus: byPaymentStatus.map((r) => ({
        status: r.paymentStatus,
        count: r._count._all,
      })),
    };
  }
}

@ApiTags('orders')
@Controller('v1/order-stats')
export class OrderStatsController {
  constructor(private readonly stats: OrderStatsService) {}

  /** ภาพรวมยอดขายและจำนวนคำสั่งซื้อตามสถานะ (หน้าแดชบอร์ดเจ้าหน้าที่) */
  @Get()
  @RequirePermissions(Permission.REPORT_READ)
  @ApiEnvelope(OrderStatsModel)
  summary() {
    return this.stats.summary();
  }
}

@Module({
  controllers: [OrderStatsController],
  providers: [OrderStatsService],
})
export class OrderStatsModule {}
