import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { buildMeta } from '../common/utils/helpers.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductDto } from './dto/query-product.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryProductDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ProductWhereInput = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.is_preorder !== undefined ? { is_preorder: query.is_preorder } : {}),
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
        skip: query.skip,
        take: limit,
        orderBy: { product_id: 'asc' },
        include: { variants: { orderBy: { variant_id: 'asc' } } },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { message: 'ดึงรายการสินค้าสำเร็จ', data: rows, meta: buildMeta(page, limit, total) };
  }

  async findCategories() {
    const rows = await this.prisma.product.groupBy({
      by: ['category'],
      _count: { category: true },
      orderBy: { category: 'asc' },
    });

    return {
      message: 'ดึงหมวดหมู่สินค้าสำเร็จ',
      data: rows.map((r) => ({ category: r.category, product_count: r._count.category })),
    };
  }

  async findOne(product_id: number) {
    const product = await this.prisma.product.findUnique({
      where: { product_id },
      include: { variants: { orderBy: { variant_id: 'asc' } } },
    });
    if (!product) throw new NotFoundException('ไม่พบสินค้า');

    return { message: 'ดึงข้อมูลสินค้าสำเร็จ', data: product };
  }

  async create(dto: CreateProductDto) {
    const isPreorder = dto.is_preorder ?? false;
    if (isPreorder && !dto.preorder_end_date) {
      throw new UnprocessableEntityException('สินค้าพรีออเดอร์ต้องระบุ preorder_end_date');
    }

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        category: dto.category,
        image_url: dto.image_url || null,
        is_preorder: isPreorder,
        preorder_end_date: dto.preorder_end_date ? new Date(dto.preorder_end_date) : null,
        estimated_delivery: dto.estimated_delivery ? new Date(dto.estimated_delivery) : null,
        ...(dto.variants?.length
          ? {
              variants: {
                create: dto.variants.map((v) => ({
                  variant_name: v.variant_name,
                  price: v.price,
                  stock_quantity: v.stock_quantity ?? 0,
                })),
              },
            }
          : {}),
      },
      include: { variants: true },
    });

    return { message: 'สร้างสินค้าสำเร็จ', data: product };
  }

  async update(product_id: number, dto: UpdateProductDto) {
    const product = await this.prisma.product.update({
      where: { product_id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        // ส่ง image_url เป็นค่าว่าง = เอารูปออก
        ...(dto.image_url !== undefined ? { image_url: dto.image_url || null } : {}),
        ...(dto.is_preorder !== undefined ? { is_preorder: dto.is_preorder } : {}),
        ...(dto.preorder_end_date !== undefined
          ? { preorder_end_date: dto.preorder_end_date ? new Date(dto.preorder_end_date) : null }
          : {}),
        ...(dto.estimated_delivery !== undefined
          ? { estimated_delivery: dto.estimated_delivery ? new Date(dto.estimated_delivery) : null }
          : {}),
      },
      include: { variants: true },
    });

    return { message: 'แก้ไขสินค้าสำเร็จ', data: product };
  }

  async remove(product_id: number) {
    const usedInOrders = await this.prisma.orderItem.count({ where: { variant: { product_id } } });
    if (usedInOrders > 0) {
      throw new ConflictException(
        `ลบไม่ได้ สินค้านี้ถูกใช้ในคำสั่งซื้อแล้ว ${usedInOrders} รายการ`,
      );
    }

    await this.prisma.product.delete({ where: { product_id } });
    return { message: 'ลบสินค้าสำเร็จ', data: { product_id } };
  }
}
