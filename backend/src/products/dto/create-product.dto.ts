import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/** ตัวเลือกสินค้าที่ส่งมาพร้อมตอนสร้างสินค้า */
export class CreateProductVariantInlineDto {
  /** ชื่อตัวเลือก เช่น "M" หรือ "ดำ / L" */
  @IsString({ message: 'ต้องระบุ variantName' })
  @IsNotEmpty({ message: 'ต้องระบุ variantName' })
  @Length(1, 50, { message: 'variantName ยาวไม่เกิน 50 ตัวอักษร' })
  variantName!: string;

  /** ราคาต่อชิ้น หน่วยสตางค์ (เช่น 25000 = 250 บาท) */
  @IsInt({ message: 'price ต้องเป็นจำนวนเต็มหน่วยสตางค์' })
  @Min(0, { message: 'price ต้องไม่ติดลบ' })
  price!: number;

  /** จำนวนคงเหลือเริ่มต้น */
  @IsOptional()
  @IsInt({ message: 'stockQuantity ต้องเป็นจำนวนเต็ม' })
  @Min(0, { message: 'stockQuantity ต้องไม่ติดลบ' })
  stockQuantity?: number;
}

export class CreateProductDto {
  /** ชื่อสินค้า */
  @IsString({ message: 'ต้องระบุ name' })
  @IsNotEmpty({ message: 'ต้องระบุ name' })
  @Length(1, 150, { message: 'name ยาวไม่เกิน 150 ตัวอักษร' })
  name!: string;

  /** รายละเอียดสินค้า */
  @IsOptional()
  @IsString()
  description?: string;

  /** หมวดหมู่ เช่น "เสื้อ" "ของที่ระลึก" */
  @IsString({ message: 'ต้องระบุ category' })
  @IsNotEmpty({ message: 'ต้องระบุ category' })
  @Length(1, 50, { message: 'category ยาวไม่เกิน 50 ตัวอักษร' })
  category!: string;

  /** URL รูปที่ได้จาก POST /api/v1/product-images (ส่ง "" เพื่อเอารูปออก) */
  @IsOptional()
  @IsString()
  @Length(0, 255, { message: 'imageUrl ยาวไม่เกิน 255 ตัวอักษร' })
  imageUrl?: string;

  /** เป็นสินค้าพรีออเดอร์หรือไม่ */
  @IsOptional()
  @IsBoolean({ message: 'isPreorder ต้องเป็น true หรือ false' })
  isPreorder?: boolean;

  /** วันปิดรับพรีออเดอร์ (ISO 8601) — บังคับเมื่อ isPreorder = true · ส่ง "" เพื่อล้างค่า */
  @IsOptional()
  @ValidateIf((o: CreateProductDto) => o.preorderEndDate !== '')
  @IsDateString({}, { message: 'preorderEndDate ต้องเป็นวันเวลา ISO 8601' })
  preorderEndDate?: string;

  /** วันที่คาดว่าจะได้รับสินค้า (YYYY-MM-DD) · ส่ง "" เพื่อล้างค่า */
  @IsOptional()
  @Matches(/^(\d{4}-\d{2}-\d{2})?$/, { message: 'estimatedDelivery ต้องเป็นรูปแบบ YYYY-MM-DD' })
  estimatedDelivery?: string;

  /** ตัวเลือกสินค้าเริ่มต้น */
  @IsOptional()
  @IsArray({ message: 'variants ต้องเป็น array' })
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantInlineDto)
  variants?: CreateProductVariantInlineDto[];
}
