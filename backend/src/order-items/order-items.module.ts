import { Module } from '@nestjs/common';
import { OrderItemsController } from './order-items.controller.js';
import { OrderItemsService } from './order-items.service.js';

@Module({
  controllers: [OrderItemsController],
  providers: [OrderItemsService],
  exports: [OrderItemsService],
})
export class OrderItemsModule {}
