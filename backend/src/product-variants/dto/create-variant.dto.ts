import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class CreateVariantDto {
  /** id ของสินค้า (UUID) */
  @IsUUID('4', { message: 'productId ต้องเป็น UUID v4' })
  productId!: string;

  /** ชื่อตัวเลือก เช่น "M" */
  @IsString({ message: 'ต้องระบุ variantName' })
  @IsNotEmpty({ message: 'ต้องระบุ variantName' })
  @Length(1, 50, { message: 'variantName ยาวไม่เกิน 50 ตัวอักษร' })
  variantName!: string;

  /** ราคาต่อชิ้น หน่วยสตางค์ */
  @IsInt({ message: 'price ต้องเป็นจำนวนเต็มหน่วยสตางค์' })
  @Min(0, { message: 'price ต้องไม่ติดลบ' })
  price!: number;

  /** จำนวนคงเหลือเริ่มต้น */
  @IsOptional()
  @IsInt({ message: 'stockQuantity ต้องเป็นจำนวนเต็ม' })
  @Min(0, { message: 'stockQuantity ต้องไม่ติดลบ' })
  stockQuantity?: number;
}
