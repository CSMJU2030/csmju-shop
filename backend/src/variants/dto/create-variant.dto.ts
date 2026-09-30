import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateVariantDto {
  @Type(() => Number)
  @IsInt({ message: 'ต้องระบุ product_id เป็นจำนวนเต็ม' })
  @Min(1, { message: 'product_id ไม่ถูกต้อง' })
  product_id: number;

  @IsString({ message: 'ต้องระบุ variant_name' })
  @Length(1, 50, { message: 'variant_name ยาวไม่เกิน 50 ตัวอักษร' })
  variant_name: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'price ต้องเป็นตัวเลขทศนิยมไม่เกิน 2 ตำแหน่ง' })
  @Min(0, { message: 'price ต้องไม่ติดลบ' })
  price: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'stock_quantity ต้องเป็นจำนวนเต็ม' })
  @Min(0, { message: 'stock_quantity ต้องไม่ติดลบ' })
  stock_quantity?: number;
}
