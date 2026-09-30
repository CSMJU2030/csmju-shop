import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { buildMeta } from '../common/utils/helpers.js';
import { CreateVariantDto } from './dto/create-variant.dto.js';
import { UpdateVariantDto } from './dto/update-variant.dto.js';
import { UpdateStockDto } from './dto/update-stock.dto.js';
import { QueryVariantDto } from './dto/query-variant.dto.js';

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryVariantDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ProductVariantWhereInput = {
      ...(query.product_id ? { product_id: query.product_id } : {}),
      ...(query.in_stock ? { stock_quantity: { gt: 0 } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.productVariant.findMany({
        where,
        skip: query.skip,
        take: limit,
        orderBy: { variant_id: 'asc' },
        include: {
          product: {
            select: { product_id: true, name: true, category: true, is_preorder: true },
          },
        },
      }),
      this.prisma.productVariant.count({ where }),
    ]);

    return {
      message: 'ดึงรายการตัวเลือกสินค้าสำเร็จ',
      data: rows,
      meta: buildMeta(page, limit, total),
    };
  }

  async findOne(variant_id: number) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { variant_id },
      include: { product: true },
    });
    if (!variant) throw new NotFoundException('ไม่พบตัวเลือกสินค้า');

    return { message: 'ดึงข้อมูลตัวเลือกสินค้าสำเร็จ', data: variant };
  }

  async create(dto: CreateVariantDto) {
    const product = await this.prisma.product.findUnique({
      where: { product_id: dto.product_id },
    });
    if (!product) throw new NotFoundException('ไม่พบสินค้าที่อ้างอิง (product_id)');

    const variant = await this.prisma.productVariant.create({
      data: {
        product_id: dto.product_id,
        variant_name: dto.variant_name,
        price: dto.price,
        stock_quantity: dto.stock_quantity ?? 0,
      },
    });

    return { message: 'สร้างตัวเลือกสินค้าสำเร็จ', data: variant };
  }

  async update(variant_id: number, dto: UpdateVariantDto) {
    const variant = await this.prisma.productVariant.update({
      where: { variant_id },
      data: {
        ...(dto.variant_name !== undefined ? { variant_name: dto.variant_name } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.stock_quantity !== undefined ? { stock_quantity: dto.stock_quantity } : {}),
      },
    });

    return { message: 'แก้ไขตัวเลือกสินค้าสำเร็จ', data: variant };
  }

  async updateStock(variant_id: number, dto: UpdateStockDto) {
    if (dto.adjust === undefined && dto.set === undefined) {
      throw new UnprocessableEntityException('ต้องระบุ adjust (บวก/ลบ) หรือ set (กำหนดค่า)');
    }

    const current = await this.prisma.productVariant.findUnique({ where: { variant_id } });
    if (!current) throw new NotFoundException('ไม่พบตัวเลือกสินค้า');

    const newQty =
      dto.set !== undefined ? dto.set : (current.stock_quantity ?? 0) + (dto.adjust ?? 0);
    if (newQty < 0) throw new UnprocessableEntityException('สต็อกคงเหลือติดลบไม่ได้');

    const variant = await this.prisma.productVariant.update({
      where: { variant_id },
      data: { stock_quantity: newQty },
    });

    return { message: 'ปรับสต็อกสำเร็จ', data: variant };
  }

  async remove(variant_id: number) {
    const used = await this.prisma.orderItem.count({ where: { variant_id } });
    if (used > 0) {
      throw new ConflictException(`ลบไม่ได้ ตัวเลือกนี้ถูกใช้ในคำสั่งซื้อแล้ว ${used} รายการ`);
    }

    await this.prisma.productVariant.delete({ where: { variant_id } });
    return { message: 'ลบตัวเลือกสินค้าสำเร็จ', data: { variant_id } };
  }
}
