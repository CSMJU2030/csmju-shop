import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateVariantDto } from './create-variant.dto.js';

/** ย้ายตัวเลือกไปสินค้าอื่นไม่ได้ จึงตัด product_id ออก */
export class UpdateVariantDto extends PartialType(
  OmitType(CreateVariantDto, ['product_id'] as const),
) {}
