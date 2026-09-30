import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { OrderItemsService } from '../order-items/order-items.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { QueryOrderDto } from './dto/query-order.dto.js';
import {
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
  UploadSlipDto,
} from './dto/update-order-status.dto.js';
import { UpdateShippingDto } from './dto/update-shipping.dto.js';
import { CreateOrderItemDto } from '../order-items/dto/order-item.dto.js';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderItemsService: OrderItemsService,
  ) {}

  /** เส้นทางแบบตายตัวต้องมาก่อน :id ไม่งั้นจะถูกจับเป็น id */
  @Get('stats/summary')
  summary() {
    return this.ordersService.summary();
  }

  @Get('number/:orderNumber')
  findByNumber(@Param('orderNumber') orderNumber: string) {
    return this.ordersService.findByNumber(orderNumber);
  }

  @Get()
  findAll(@Query() query: QueryOrderDto) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Patch(':id/payment-status')
  updatePaymentStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePaymentStatusDto) {
    return this.ordersService.updatePaymentStatus(id, dto);
  }

  @Patch(':id/order-status')
  updateOrderStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateOrderStatus(id, dto);
  }

  /** บันทึกบริษัทขนส่ง + เลขพัสดุ (เฉพาะออร์เดอร์แบบจัดส่ง) */
  @Patch(':id/shipping')
  updateShipping(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateShippingDto) {
    return this.ordersService.updateShipping(id, dto);
  }

  @Patch(':id/payment-slip')
  uploadSlip(@Param('id', ParseIntPipe) id: number, @Body() dto: UploadSlipDto) {
    return this.ordersService.uploadSlip(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.remove(id);
  }

  // ── รายการสินค้าในคำสั่งซื้อ (nested) ──

  @Get(':orderId/items')
  findItems(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.orderItemsService.findByOrder(orderId);
  }

  @Post(':orderId/items')
  @HttpCode(HttpStatus.CREATED)
  addItem(@Param('orderId', ParseIntPipe) orderId: number, @Body() dto: CreateOrderItemDto) {
    return this.orderItemsService.create(orderId, dto);
  }
}
