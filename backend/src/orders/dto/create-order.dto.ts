import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { DELIVERY_METHODS } from '../../common/constants.js';

export class OrderItemInputDto {
  @Type(() => Number)
  @IsInt({ message: 'ต้องระบุ variant_id เป็นจำนวนเต็ม' })
  @Min(1, { message: 'variant_id ไม่ถูกต้อง' })
  variant_id: number;

  @Type(() => Number)
  @IsInt({ message: 'quantity ต้องเป็นจำนวนเต็ม' })
  @Min(1, { message: 'quantity ต้องมากกว่า 0' })
  quantity: number;
}

export class CreateOrderDto {
  /**
   * ผู้สั่งซื้อ — claim `sub` จาก Core Hub
   * (ก่อนเชื่อม Core Hub หน้าเว็บส่งค่าจากตัวตนทดสอบมาให้)
   */
  @IsString({ message: 'ต้องระบุ core_user_id' })
  @Length(1, 64, { message: 'core_user_id ยาว 1–64 ตัวอักษร' })
  core_user_id: string;

  @IsString({ message: 'ต้องระบุ customer_name' })
  @Length(1, 100, { message: 'customer_name ยาว 1–100 ตัวอักษร' })
  customer_name: string;

  @IsEmail({}, { message: 'customer_email ไม่ใช่อีเมลที่ถูกต้อง' })
  @Length(1, 100)
  customer_email: string;

  @Matches(/^[0-9+\-\s]{9,15}$/, { message: 'customer_phone ต้องเป็นเบอร์โทร 9–15 หลัก' })
  customer_phone: string;

  @IsOptional()
  @IsString()
  @Length(1, 20, { message: 'customer_student_id ยาวไม่เกิน 20 ตัวอักษร' })
  customer_student_id?: string;

  @IsIn(DELIVERY_METHODS, {
    message: `delivery_method ต้องเป็นหนึ่งใน: ${DELIVERY_METHODS.join(', ')}`,
  })
  delivery_method: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'shipping_fee ต้องเป็นตัวเลข' })
  @Min(0, { message: 'shipping_fee ต้องไม่ติดลบ' })
  shipping_fee?: number;

  @IsOptional()
  @IsString()
  shipping_address?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255, { message: 'payment_slip ยาวไม่เกิน 255 ตัวอักษร' })
  payment_slip?: string;

  @IsArray({ message: 'items ต้องเป็น array' })
  @ArrayMinSize(1, { message: 'ต้องระบุ items อย่างน้อย 1 รายการ' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];
}
