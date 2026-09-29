import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '../../generated/prisma/enums';
import { OrderModel } from '../orders/order.model';

export class PickupLogOrderModel {
  id!: string;
  orderNumber!: string;
  @ApiProperty({ type: String, nullable: true })
  pickupCode!: string | null;
  @ApiProperty({ enum: OrderStatus, enumName: 'OrderStatus' })
  orderStatus!: OrderStatus;
  @ApiProperty({ enum: PaymentStatus, enumName: 'PaymentStatus' })
  paymentStatus!: PaymentStatus;
  recipientName!: string;
  customerEmail!: string;
}

export class PickupLogModel {
  id!: string;
  orderId!: string;
  staffCoreUserId!: string;
  staffEmail!: string;
  pickupTime!: Date;
  @ApiProperty({ type: String, nullable: true })
  notes!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  @ApiProperty({ type: () => PickupLogOrderModel })
  order!: PickupLogOrderModel;
}

export class PickupVerificationModel {
  /** true = ส่งมอบได้ (ชำระแล้ว · ไม่ถูกยกเลิก · ยังไม่เคยรับ) */
  valid!: boolean;
  alreadyPickedUp!: boolean;
  @ApiProperty({ type: () => OrderModel })
  order!: OrderModel;
}
