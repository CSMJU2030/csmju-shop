import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

/** ตัวเลือกสินค้าที่ส่งมาพร้อมตอนสร้างสินค้า */
export class CreateProductVariantInlineDto {
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

export class CreateProductDto {
  @IsString({ message: 'ต้องระบุ name' })
  @Length(1, 150, { message: 'name ยาวไม่เกิน 150 ตัวอักษร' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString({ message: 'ต้องระบุ category' })
  @Length(1, 50, { message: 'category ยาวไม่เกิน 50 ตัวอักษร' })
  category: string;

  /** ที่อยู่รูปที่ได้จาก POST /api/uploads/image (หรือ URL รูปจากที่อื่นก็ได้) */
  @IsOptional()
  @IsString()
  @Length(0, 255, { message: 'image_url ยาวไม่เกิน 255 ตัวอักษร' })
  image_url?: string;

  @IsOptional()
  @IsBoolean({ message: 'is_preorder ต้องเป็น true หรือ false' })
  is_preorder?: boolean;

  @IsOptional()
  @IsDateString({}, { message: 'preorder_end_date ต้องเป็นวันที่รูปแบบ ISO' })
  preorder_end_date?: string;

  @IsOptional()
  @IsDateString({}, { message: 'estimated_delivery ต้องเป็นวันที่รูปแบบ ISO' })
  estimated_delivery?: string;

  @IsOptional()
  @IsArray({ message: 'variants ต้องเป็น array' })
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantInlineDto)
  variants?: CreateProductVariantInlineDto[];
}
