import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { DeliveryMethod } from '../../../generated/prisma/enums';

export class OrderItemInputDto {
  /** id ของตัวเลือกสินค้า */
  @IsUUID('4', { message: 'variantId ต้องเป็น UUID v4' })
  variantId!: string;

  /** จำนวน */
  @IsInt({ message: 'quantity ต้องเป็นจำนวนเต็ม' })
  @Min(1, { message: 'quantity ต้องมากกว่า 0' })
  @Max(99, { message: 'quantity สูงสุด 99 ต่อรายการ' })
  quantity!: number;
}

/**
 * สร้างคำสั่งซื้อ — เจ้าของคือผู้ที่ login อยู่ (claim `sub`) ไม่รับ id ผู้ใช้จาก body
 * ค่าจัดส่งคิดฝั่งเซิร์ฟเวอร์ ไม่รับจาก client
 */
export class CreateOrderDto {
  /** PICKUP = รับที่สาขา · DELIVERY = จัดส่ง */
  @IsEnum(DeliveryMethod, { message: 'deliveryMethod ต้องเป็น PICKUP หรือ DELIVERY' })
  deliveryMethod!: DeliveryMethod;

  /** ชื่อผู้รับ */
  @IsString({ message: 'ต้องระบุ recipientName' })
  @IsNotEmpty({ message: 'ต้องระบุ recipientName' })
  @Length(1, 100, { message: 'recipientName ยาวไม่เกิน 100 ตัวอักษร' })
  recipientName!: string;

  /** เบอร์โทร ตัวเลขล้วน 9–10 หลัก ไม่มีขีด */
  @Matches(/^0\d{8,9}$/, {
    message: 'recipientPhone ต้องเป็นตัวเลข 9–10 หลักขึ้นต้นด้วย 0 ไม่มีขีด',
  })
  recipientPhone!: string;

  /** ที่อยู่จัดส่ง — บังคับเมื่อ deliveryMethod = DELIVERY */
  @IsOptional()
  @IsString()
  @Length(0, 500, { message: 'shippingAddress ยาวไม่เกิน 500 ตัวอักษร' })
  shippingAddress?: string;

  /** URL หรือชื่อไฟล์สลิปโอนเงิน (แนบภายหลังได้) */
  @IsOptional()
  @IsString()
  @Length(1, 255, { message: 'paymentSlip ยาวไม่เกิน 255 ตัวอักษร' })
  paymentSlip?: string;

  /** รายการสินค้า */
  @IsArray({ message: 'items ต้องเป็น array' })
  @ArrayMinSize(1, { message: 'ต้องมีสินค้าอย่างน้อย 1 รายการ' })
  @ArrayMaxSize(50, { message: 'สั่งได้ไม่เกิน 50 รายการต่อครั้ง' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items!: OrderItemInputDto[];
}
