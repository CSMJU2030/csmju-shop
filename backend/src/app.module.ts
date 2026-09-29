import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { MeController } from './auth/me.controller';
import { AppConfigModule } from './config/config.module';
import { HealthController } from './health/health.controller';
import { OrderItemsModule } from './order-items/order-items.module';
import { OrderStatsModule } from './order-stats/order-stats.controller';
import { OrdersModule } from './orders/orders.module';
import { PickupLogsModule } from './pickup-logs/pickup-logs.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductImagesModule } from './product-images/product-images.controller';
import { ProductVariantsModule } from './product-variants/product-variants.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    ProductsModule,
    ProductVariantsModule,
    OrdersModule,
    OrderItemsModule,
    PickupLogsModule,
    OrderStatsModule,
    ProductImagesModule,
  ],
  controllers: [HealthController, MeController],
  // ยังไม่ได้เชื่อม Core Hub: ไม่มีตัวตนผู้ใช้ PermissionsGuard จึงปฏิเสธทุกเส้นทางที่ต้องมีสิทธิ์ (fail-closed)
  providers: [{ provide: APP_GUARD, useClass: PermissionsGuard }],
})
export class AppModule {}
