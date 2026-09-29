import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { CoreHubIdentity } from '../auth/core-hub-identity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { UuidParam } from '../common/uuid.pipe';
import { UpdateOrderItemDto } from './dto/order-item.dto';
import { OrderItemsService } from './order-items.service';
import { ApiEnvelope, DeletedModel } from '../common/api-envelope.decorator';
import { OrderItemModel } from '../orders/order.model';

/** /api/v1/order-items/:id — รายการที่ผูกกับคำสั่งซื้ออยู่ที่ /api/v1/orders/:id/items */
@ApiTags('order-items')
@Controller('v1/order-items')
export class OrderItemsController {
  constructor(private readonly items: OrderItemsService) {}

  @Get(':id')
  @RequirePermissions(Permission.ORDER_READ_ANY, Permission.ORDER_READ_OWN)
  @ApiEnvelope(OrderItemModel)
  findOne(@CurrentUser() user: CoreHubIdentity, @Param('id', UuidParam) id: string) {
    return this.items.findOne(user, id);
  }

  /** แก้จำนวน (เจ้าหน้าที่) */
  @Patch(':id')
  @RequirePermissions(Permission.ORDER_UPDATE_ANY)
  @ApiEnvelope(OrderItemModel)
  update(@Param('id', UuidParam) id: string, @Body() dto: UpdateOrderItemDto) {
    return this.items.update(id, dto);
  }

  /** ลบรายการและคืนสต็อก (เจ้าหน้าที่) */
  @Delete(':id')
  @RequirePermissions(Permission.ORDER_UPDATE_ANY)
  @ApiEnvelope(DeletedModel)
  remove(@Param('id', UuidParam) id: string) {
    return this.items.remove(id);
  }
}
