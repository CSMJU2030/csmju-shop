import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/** แก้ไขสินค้า (บางฟิลด์) — ตัวเลือกสินค้าแก้แยกที่ /api/v1/product-variants */
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['variants'] as const),
) {}
