import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { UuidParam } from '../common/uuid.pipe';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';
import { ApiEnvelope, DeletedModel } from '../common/api-envelope.decorator';
import { ProductCategoryModel, ProductModel } from './product.model';

@ApiTags('products')
@Controller('v1/products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  /** รายการสินค้า (แบ่งหน้า) */
  @Get()
  @RequirePermissions(Permission.PRODUCT_READ)
  @ApiEnvelope(ProductModel, { paginated: true })
  findAll(@Query() query: QueryProductDto) {
    return this.products.findAll(query);
  }

  /** สินค้าหนึ่งรายการพร้อมตัวเลือก */
  @Get(':id')
  @RequirePermissions(Permission.PRODUCT_READ)
  @ApiEnvelope(ProductModel)
  findOne(@Param('id', UuidParam) id: string) {
    return this.products.findOne(id);
  }

  /** เพิ่มสินค้า (เจ้าหน้าที่) */
  @Post()
  @RequirePermissions(Permission.PRODUCT_CREATE)
  @ApiEnvelope(ProductModel, { created: true })
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  /** แก้ไขสินค้าบางฟิลด์ (เจ้าหน้าที่) */
  @Patch(':id')
  @RequirePermissions(Permission.PRODUCT_UPDATE)
  @ApiEnvelope(ProductModel)
  update(@Param('id', UuidParam) id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  /** ลบสินค้า (ผู้ดูแล) — ลบไม่ได้ถ้าเคยถูกสั่งซื้อแล้ว */
  @Delete(':id')
  @RequirePermissions(Permission.PRODUCT_DELETE)
  @ApiEnvelope(DeletedModel)
  remove(@Param('id', UuidParam) id: string) {
    return this.products.remove(id);
  }
}

@ApiTags('products')
@Controller('v1/product-categories')
export class ProductCategoriesController {
  constructor(private readonly products: ProductsService) {}

  /** หมวดหมู่สินค้าพร้อมจำนวนสินค้าในแต่ละหมวด */
  @Get()
  @RequirePermissions(Permission.PRODUCT_READ)
  @ApiEnvelope(ProductCategoryModel, { paginated: true })
  findAll(@Query() query: PaginationQueryDto) {
    return this.products.categories(query.page, query.limit);
  }
}
