import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { CoreHubIdentity } from '../auth/core-hub-identity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { UuidParam } from '../common/uuid.pipe';
import { CreateOrderItemDto } from '../order-items/dto/order-item.dto';
import { OrderItemsService } from '../order-items/order-items.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import {
  UpdateOrderStatusDto,
  UpdatePaymentSlipDto,
  UpdatePaymentStatusDto,
  UpdateShippingDto,
} from './dto/update-order.dto';
import { OrdersService } from './orders.service';
import { ApiEnvelope, DeletedModel } from '../common/api-envelope.decorator';
import { OrderItemModel, OrderModel } from './order.model';

@ApiTags('orders')
@Controller('v1/orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly items: OrderItemsService,
  ) {}

  /** รายการคำสั่งซื้อ — ลูกค้าเห็นเฉพาะของตัวเอง เจ้าหน้าที่เห็นทั้งหมด */
  @Get()
  @RequirePermissions(Permission.ORDER_READ_ANY, Permission.ORDER_READ_OWN)
  @ApiEnvelope(OrderModel, { paginated: true })
  findAll(@CurrentUser() user: CoreHubIdentity, @Query() query: QueryOrderDto) {
    return this.orders.findAll(user, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.ORDER_READ_ANY, Permission.ORDER_READ_OWN)
  @ApiEnvelope(OrderModel)
  findOne(@CurrentUser() user: CoreHubIdentity, @Param('id', UuidParam) id: string) {
    return this.orders.findOne(user, id);
  }

  /** สั่งซื้อ — เจ้าของคือผู้ที่ login อยู่ */
  @Post()
  @RequirePermissions(Permission.ORDER_CREATE_OWN)
  @ApiEnvelope(OrderModel, { created: true })
  create(@CurrentUser() user: CoreHubIdentity, @Body() dto: CreateOrderDto) {
    return this.orders.create(user, dto);
  }

  /** ตรวจสลิป / เปลี่ยนสถานะการชำระเงิน (เจ้าหน้าที่) */
  @Patch(':id/payment-status')
  @RequirePermissions(Permission.ORDER_UPDATE_ANY)
  @ApiEnvelope(OrderModel)
  updatePaymentStatus(@Param('id', UuidParam) id: string, @Body() dto: UpdatePaymentStatusDto) {
    return this.orders.updatePaymentStatus(id, dto);
  }

  /** เปลี่ยนสถานะคำสั่งซื้อ (เจ้าหน้าที่) — ยกเลิกแล้วคืนสต็อก */
  @Patch(':id/order-status')
  @RequirePermissions(Permission.ORDER_UPDATE_ANY)
  @ApiEnvelope(OrderModel)
  updateOrderStatus(@Param('id', UuidParam) id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orders.updateOrderStatus(id, dto);
  }

  /** บริษัทขนส่ง + เลขพัสดุ (เฉพาะแบบจัดส่ง) */
  @Patch(':id/shipping')
  @RequirePermissions(Permission.ORDER_UPDATE_ANY)
  @ApiEnvelope(OrderModel)
  updateShipping(@Param('id', UuidParam) id: string, @Body() dto: UpdateShippingDto) {
    return this.orders.updateShipping(id, dto);
  }

  /** แนบสลิปการชำระเงิน — เจ้าของคำสั่งซื้อ */
  @Patch(':id/payment-slip')
  @RequirePermissions(Permission.ORDER_UPDATE_ANY, Permission.ORDER_UPDATE_OWN)
  @ApiEnvelope(OrderModel)
  updatePaymentSlip(
    @CurrentUser() user: CoreHubIdentity,
    @Param('id', UuidParam) id: string,
    @Body() dto: UpdatePaymentSlipDto,
  ) {
    return this.orders.updatePaymentSlip(user, id, dto);
  }

  /** ลบคำสั่งซื้อ (ผู้ดูแล) */
  @Delete(':id')
  @RequirePermissions(Permission.ORDER_DELETE_ANY)
  @ApiEnvelope(DeletedModel)
  remove(@Param('id', UuidParam) id: string) {
    return this.orders.remove(id);
  }

  /** รายการสินค้าในคำสั่งซื้อ */
  @Get(':id/items')
  @RequirePermissions(Permission.ORDER_READ_ANY, Permission.ORDER_READ_OWN)
  @ApiEnvelope(OrderItemModel, { paginated: true })
  findItems(@CurrentUser() user: CoreHubIdentity, @Param('id', UuidParam) id: string) {
    return this.items.findByOrder(user, id);
  }

  /** เพิ่มสินค้าเข้าคำสั่งซื้อ (เจ้าหน้าที่) */
  @Post(':id/items')
  @RequirePermissions(Permission.ORDER_UPDATE_ANY)
  @ApiEnvelope(OrderItemModel, { created: true })
  addItem(@Param('id', UuidParam) id: string, @Body() dto: CreateOrderItemDto) {
    return this.items.create(id, dto);
  }
}
