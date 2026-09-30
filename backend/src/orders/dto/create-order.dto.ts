import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
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
  @Type(() => Number)
  @IsInt({ message: 'ต้องระบุ user_id เป็นจำนวนเต็ม' })
  @Min(1, { message: 'user_id ไม่ถูกต้อง' })
  user_id: number;

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
