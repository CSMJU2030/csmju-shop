import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { OrderStatus, PaymentStatus } from '../../../generated/prisma/enums';

export class UpdatePaymentStatusDto {
  /** สถานะการชำระเงินใหม่ */
  @IsEnum(PaymentStatus, { message: 'paymentStatus ไม่ถูกต้อง' })
  paymentStatus!: PaymentStatus;
}

export class UpdateOrderStatusDto {
  /** สถานะคำสั่งซื้อใหม่ */
  @IsEnum(OrderStatus, { message: 'orderStatus ไม่ถูกต้อง' })
  orderStatus!: OrderStatus;
}

export class UpdatePaymentSlipDto {
  /** URL หรือชื่อไฟล์สลิปโอนเงิน */
  @IsString({ message: 'ต้องระบุ paymentSlip' })
  @Length(1, 255, { message: 'paymentSlip ยาวไม่เกิน 255 ตัวอักษร' })
  paymentSlip!: string;
}

/**
 * ข้อมูลการจัดส่งของคำสั่งซื้อแบบ DELIVERY
 * ส่ง "" มาทั้งสองช่อง = ล้างข้อมูลการจัดส่ง (กรณีกรอกผิด)
 */
export class UpdateShippingDto {
  /** รหัสบริษัทขนส่ง เช่น thailand_post / flash / kerry หรือชื่อขนส่งอื่น */
  @IsOptional()
  @IsString({ message: 'shippingCarrier ต้องเป็นข้อความ' })
  @Length(0, 50, { message: 'shippingCarrier ยาวไม่เกิน 50 ตัวอักษร' })
  shippingCarrier?: string;

  /** เลขพัสดุ */
  @IsOptional()
  @IsString({ message: 'trackingNumber ต้องเป็นข้อความ' })
  @Length(0, 50, { message: 'trackingNumber ยาวไม่เกิน 50 ตัวอักษร' })
  trackingNumber?: string;

  /** true (ค่าเริ่มต้น) = ใส่เลขพัสดุครั้งแรกแล้วเปลี่ยนสถานะเป็น SHIPPED ให้เลย */
  @IsOptional()
  @IsBoolean({ message: 'markShipped ต้องเป็น true หรือ false' })
  markShipped?: boolean;
}
