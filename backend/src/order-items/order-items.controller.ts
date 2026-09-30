import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { OrderItemsService } from './order-items.service.js';
import { UpdateOrderItemDto } from './dto/order-item.dto.js';

/** เส้นทางแบบเดี่ยว /api/v1/order-items/:id — ส่วนที่ผูกกับออร์เดอร์อยู่ใน OrdersController */
@Controller('v1/order-items')
export class OrderItemsController {
  constructor(private readonly orderItemsService: OrderItemsService) {}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.orderItemsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderItemDto) {
    return this.orderItemsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.orderItemsService.remove(id);
  }
}
