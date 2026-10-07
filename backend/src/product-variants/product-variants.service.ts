import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { ApiError } from '../common/api-error';
import { deleted, Paginated } from '../common/envelope';
import { skipOf } from '../common/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { QueryVariantDto } from './dto/query-variant.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

const VARIANT_INCLUDE = {
  product: { select: { id: true, name: true, category: true, isPreorder: true, imageUrl: true } },
} satisfies Prisma.ProductVariantInclude;

@Injectable()
export class ProductVariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryVariantDto) {
    const where: Prisma.ProductVariantWhereInput = {
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.inStock === true ? { stockQuantity: { gt: 0 } } : {}),
      ...(query.inStock === false ? { stockQuantity: { lte: 0 } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.productVariant.findMany({
        where,
        skip: skipOf(query),
        take: query.limit,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: VARIANT_INCLUDE,
      }),
      this.prisma.productVariant.count({ where }),
    ]);
    return Paginated.of(rows, total, query.page, query.limit);
  }

  async findOne(id: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
      include: VARIANT_INCLUDE,
    });
    if (!variant) throw new ApiError('NOT_FOUND', 'ไม่พบตัวเลือกสินค้า');
    return variant;
  }

  async create(dto: CreateVariantDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new ApiError('NOT_FOUND', 'ไม่พบสินค้าที่อ้างอิง (productId)');

    return this.prisma.productVariant.create({
      data: {
        productId: dto.productId,
        variantName: dto.variantName,
        price: dto.price,
        stockQuantity: dto.stockQuantity ?? 0,
      },
      include: VARIANT_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateVariantDto) {
    await this.findOne(id);
    return this.prisma.productVariant.update({
      where: { id },
      data: {
        ...(dto.variantName !== undefined ? { variantName: dto.variantName } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.stockQuantity !== undefined ? { stockQuantity: dto.stockQuantity } : {}),
      },
      include: VARIANT_INCLUDE,
    });
  }

  async updateStock(id: string, dto: UpdateStockDto) {
    if (dto.adjust === undefined && dto.set === undefined) {
      throw new ApiError('VALIDATION_ERROR', 'ต้องระบุ adjust (บวก/ลบ) หรือ set (กำหนดค่า)', [
        'adjust or set is required',
      ]);
    }
    if (dto.adjust !== undefined && dto.set !== undefined) {
      throw new ApiError('VALIDATION_ERROR', 'ระบุได้อย่างใดอย่างหนึ่งระหว่าง adjust กับ set', [
        'adjust and set cannot be used together',
      ]);
    }

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.productVariant.findUnique({ where: { id } });
      if (!current) throw new ApiError('NOT_FOUND', 'ไม่พบตัวเลือกสินค้า');

      const next = dto.set !== undefined ? dto.set : current.stockQuantity + (dto.adjust ?? 0);
      if (next < 0) throw new ApiError('CONFLICT', 'สต็อกคงเหลือติดลบไม่ได้');

      return tx.productVariant.update({
        where: { id },
        data: { stockQuantity: next },
        include: VARIANT_INCLUDE,
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const used = await this.prisma.orderItem.count({ where: { variantId: id } });
    if (used > 0) {
      throw new ApiError('CONFLICT', `ลบไม่ได้ ตัวเลือกนี้ถูกใช้ในคำสั่งซื้อแล้ว ${used} รายการ`);
    }
    await this.prisma.productVariant.delete({ where: { id } });
    return deleted(id);
  }
}
