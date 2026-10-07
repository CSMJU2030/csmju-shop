import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { ApiError } from '../common/api-error';
import { deleted, Paginated } from '../common/envelope';
import { skipOf } from '../common/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { toDateOnly } from '../shop/shop.constants';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const PRODUCT_INCLUDE = {
  variants: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof PRODUCT_INCLUDE }>;

/** แปลงแถวจากฐานข้อมูลเป็น JSON ตามสัญญา (estimatedDelivery เป็น YYYY-MM-DD) */
export function presentProduct(product: ProductRow) {
  return { ...product, estimatedDelivery: toDateOnly(product.estimatedDelivery) };
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryProductDto) {
    const where: Prisma.ProductWhereInput = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.isPreorder !== undefined ? { isPreorder: query.isPreorder } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: skipOf(query),
        take: query.limit,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: PRODUCT_INCLUDE,
      }),
      this.prisma.product.count({ where }),
    ]);

    return Paginated.of(rows.map(presentProduct), total, query.page, query.limit);
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw new ApiError('NOT_FOUND', 'ไม่พบสินค้า');
    return presentProduct(product);
  }

  async create(dto: CreateProductDto) {
    const isPreorder = dto.isPreorder ?? false;
    if (isPreorder && !dto.preorderEndDate) {
      throw new ApiError('VALIDATION_ERROR', 'สินค้าพรีออเดอร์ต้องระบุ preorderEndDate', [
        'preorderEndDate is required when isPreorder is true',
      ]);
    }

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        category: dto.category,
        imageUrl: dto.imageUrl || null,
        isPreorder,
        preorderEndDate: dto.preorderEndDate ? new Date(dto.preorderEndDate) : null,
        estimatedDelivery: dto.estimatedDelivery ? new Date(dto.estimatedDelivery) : null,
        ...(dto.variants?.length
          ? {
              variants: {
                create: dto.variants.map((v) => ({
                  variantName: v.variantName,
                  price: v.price,
                  stockQuantity: v.stockQuantity ?? 0,
                })),
              },
            }
          : {}),
      },
      include: PRODUCT_INCLUDE,
    });
    return presentProduct(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    const current = await this.prisma.product.findUnique({ where: { id } });
    if (!current) throw new ApiError('NOT_FOUND', 'ไม่พบสินค้า');

    const isPreorder = dto.isPreorder ?? current.isPreorder;
    const preorderEnd =
      dto.preorderEndDate !== undefined ? dto.preorderEndDate : current.preorderEndDate;
    if (isPreorder && !preorderEnd) {
      throw new ApiError('VALIDATION_ERROR', 'สินค้าพรีออเดอร์ต้องระบุ preorderEndDate', [
        'preorderEndDate is required when isPreorder is true',
      ]);
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description || null } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl || null } : {}),
        ...(dto.isPreorder !== undefined ? { isPreorder: dto.isPreorder } : {}),
        ...(dto.preorderEndDate !== undefined
          ? { preorderEndDate: dto.preorderEndDate ? new Date(dto.preorderEndDate) : null }
          : {}),
        ...(dto.estimatedDelivery !== undefined
          ? { estimatedDelivery: dto.estimatedDelivery ? new Date(dto.estimatedDelivery) : null }
          : {}),
      },
      include: PRODUCT_INCLUDE,
    });
    return presentProduct(product);
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new ApiError('NOT_FOUND', 'ไม่พบสินค้า');

    const usedInOrders = await this.prisma.orderItem.count({
      where: { variant: { productId: id } },
    });
    if (usedInOrders > 0) {
      throw new ApiError(
        'CONFLICT',
        `ลบไม่ได้ สินค้านี้ถูกใช้ในคำสั่งซื้อแล้ว ${usedInOrders} รายการ`,
      );
    }

    await this.prisma.product.delete({ where: { id } });
    return deleted(id);
  }

  /** หมวดหมู่ทั้งหมด พร้อมจำนวนสินค้า */
  async categories(page: number, limit: number) {
    const rows = await this.prisma.product.groupBy({
      by: ['category'],
      _count: { _all: true },
      orderBy: { category: 'asc' },
    });
    const items = rows.map((r) => ({ category: r.category, productCount: r._count._all }));
    return Paginated.of(items.slice((page - 1) * limit, page * limit), items.length, page, limit);
  }
}
