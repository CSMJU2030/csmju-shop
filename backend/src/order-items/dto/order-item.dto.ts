import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class CreateOrderItemDto {
  /** id ของตัวเลือกสินค้า */
  @IsUUID('4', { message: 'variantId ต้องเป็น UUID v4' })
  variantId!: string;

  /** จำนวน */
  @IsInt({ message: 'quantity ต้องเป็นจำนวนเต็ม' })
  @Min(1, { message: 'quantity ต้องมากกว่า 0' })
  @Max(99, { message: 'quantity สูงสุด 99 ต่อรายการ' })
  quantity!: number;
}

export class UpdateOrderItemDto {
  /** จำนวนใหม่ */
  @IsInt({ message: 'quantity ต้องเป็นจำนวนเต็ม' })
  @Min(1, { message: 'quantity ต้องมากกว่า 0' })
  @Max(99, { message: 'quantity สูงสุด 99 ต่อรายการ' })
  quantity!: number;
}
