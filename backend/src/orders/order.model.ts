import { ApiProperty } from '@nestjs/swagger';
import { DeliveryMethod, OrderStatus, PaymentStatus } from '../../generated/prisma/enums';

export class OrderItemProductModel {
  id!: string;
  name!: string;
  category!: string;
  isPreorder!: boolean;
  @ApiProperty({ type: String, nullable: true })
  imageUrl!: string | null;
}

export class OrderItemVariantModel {
  id!: string;
  variantName!: string;
  @ApiProperty({ type: () => OrderItemProductModel })
  product!: OrderItemProductModel;
}

export class OrderItemModel {
  id!: string;
  orderId!: string;
  variantId!: string;
  quantity!: number;
  /** ราคาต่อชิ้น ณ ตอนสั่ง หน่วยสตางค์ */
  unitPrice!: number;
  isPreorderItem!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  @ApiProperty({ type: () => OrderItemVariantModel })
  variant!: OrderItemVariantModel;
}

export class PickupLogEntryModel {
  id!: string;
  orderId!: string;
  staffCoreUserId!: string;
  staffEmail!: string;
  pickupTime!: Date;
  @ApiProperty({ type: String, nullable: true })
  notes!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class OrderModel {
  id!: string;
  /** เช่น ORD-202609-0001 */
  orderNumber!: string;
  /** เจ้าของคำสั่งซื้อ (claim `sub` ของ Core Hub) */
  coreUserId!: string;
  customerEmail!: string;
  recipientName!: string;
  recipientPhone!: string;
  /** ยอดรวม หน่วยสตางค์ */
  totalAmount!: number;
  @ApiProperty({ enum: DeliveryMethod, enumName: 'DeliveryMethod' })
  deliveryMethod!: DeliveryMethod;
  /** ค่าจัดส่ง หน่วยสตางค์ */
  shippingFee!: number;
  @ApiProperty({ type: String, nullable: true })
  shippingAddress!: string | null;
  @ApiProperty({ type: String, nullable: true })
  paymentSlip!: string | null;
  @ApiProperty({ enum: PaymentStatus, enumName: 'PaymentStatus' })
  paymentStatus!: PaymentStatus;
  @ApiProperty({ enum: OrderStatus, enumName: 'OrderStatus' })
  orderStatus!: OrderStatus;
  /** รหัสรับสินค้า (เฉพาะ PICKUP) */
  @ApiProperty({ type: String, nullable: true })
  pickupCode!: string | null;
  @ApiProperty({ type: String, nullable: true })
  shippingCarrier!: string | null;
  @ApiProperty({ type: String, nullable: true })
  trackingNumber!: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  shippedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  @ApiProperty({ type: () => [OrderItemModel] })
  orderItems!: OrderItemModel[];
  @ApiProperty({ type: () => [PickupLogEntryModel] })
  pickupLogs!: PickupLogEntryModel[];
}

export class StatusCountModel {
  status!: string;
  count!: number;
}

export class OrderStatsModel {
  totalOrders!: number;
  /** ยอดขายที่ชำระแล้ว หน่วยสตางค์ */
  paidRevenue!: number;
  @ApiProperty({ type: () => [StatusCountModel] })
  byOrderStatus!: StatusCountModel[];
  @ApiProperty({ type: () => [StatusCountModel] })
  byPaymentStatus!: StatusCountModel[];
}
