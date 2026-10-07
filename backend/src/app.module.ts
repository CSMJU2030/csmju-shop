import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AppConfigModule } from './config/config.module';
import { HealthController } from './health/health.controller';
import { OrderItemsModule } from './order-items/order-items.module';
import { OrderStatsModule } from './order-stats/order-stats.controller';
import { OrdersModule } from './orders/orders.module';
import { PickupLogsModule } from './pickup-logs/pickup-logs.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductImagesModule } from './product-images/product-images.controller';
import { PaymentSlipsModule } from './payment-slips/payment-slips.controller';
import { ProductVariantsModule } from './product-variants/product-variants.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    AuthModule,
    ProductsModule,
    ProductVariantsModule,
    OrdersModule,
    OrderItemsModule,
    PickupLogsModule,
    OrderStatsModule,
    ProductImagesModule,
    PaymentSlipsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
