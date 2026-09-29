import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateVariantDto } from './create-variant.dto';

/** ย้ายตัวเลือกไปสินค้าอื่นไม่ได้ จึงตัด productId ออก */
export class UpdateVariantDto extends PartialType(
  OmitType(CreateVariantDto, ['productId'] as const),
) {}
