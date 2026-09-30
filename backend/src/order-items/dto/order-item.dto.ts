import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateOrderItemDto {
  @Type(() => Number)
  @IsInt({ message: 'ต้องระบุ variant_id เป็นจำนวนเต็ม' })
  @Min(1, { message: 'variant_id ไม่ถูกต้อง' })
  variant_id: number;

  @Type(() => Number)
  @IsInt({ message: 'quantity ต้องเป็นจำนวนเต็ม' })
  @Min(1, { message: 'quantity ต้องมากกว่า 0' })
  quantity: number;
}

export class UpdateOrderItemDto {
  @Type(() => Number)
  @IsInt({ message: 'quantity ต้องเป็นจำนวนเต็ม' })
  @Min(1, { message: 'quantity ต้องมากกว่า 0' })
  quantity: number;
}
