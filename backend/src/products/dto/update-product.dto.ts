import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto.js';

/** แก้ไขสินค้า — แก้ variants แยกที่ /api/variants */
export class UpdateProductDto extends PartialType(OmitType(CreateProductDto, ['variants'] as const)) {}
