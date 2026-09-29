import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/permissions';
import { UuidParam } from '../common/uuid.pipe';
import { CreateVariantDto } from './dto/create-variant.dto';
import { QueryVariantDto } from './dto/query-variant.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { ProductVariantsService } from './product-variants.service';
import { ApiEnvelope, DeletedModel } from '../common/api-envelope.decorator';
import { VariantWithProductModel } from '../products/product.model';

@ApiTags('product-variants')
@Controller('v1/product-variants')
export class ProductVariantsController {
  constructor(private readonly variants: ProductVariantsService) {}

  /** รายการตัวเลือกสินค้า (ใช้หน้าจัดการสต็อก) */
  @Get()
  @RequirePermissions(Permission.PRODUCT_READ)
  @ApiEnvelope(VariantWithProductModel, { paginated: true })
  findAll(@Query() query: QueryVariantDto) {
    return this.variants.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.PRODUCT_READ)
  @ApiEnvelope(VariantWithProductModel)
  findOne(@Param('id', UuidParam) id: string) {
    return this.variants.findOne(id);
  }

  /** เพิ่มตัวเลือกให้สินค้า (เจ้าหน้าที่) */
  @Post()
  @RequirePermissions(Permission.PRODUCT_UPDATE)
  @ApiEnvelope(VariantWithProductModel, { created: true })
  create(@Body() dto: CreateVariantDto) {
    return this.variants.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PRODUCT_UPDATE)
  @ApiEnvelope(VariantWithProductModel)
  update(@Param('id', UuidParam) id: string, @Body() dto: UpdateVariantDto) {
    return this.variants.update(id, dto);
  }

  /** ปรับสต็อก (เพิ่ม/ลด หรือกำหนดค่า) */
  @Patch(':id/stock')
  @RequirePermissions(Permission.STOCK_UPDATE)
  @ApiEnvelope(VariantWithProductModel)
  updateStock(@Param('id', UuidParam) id: string, @Body() dto: UpdateStockDto) {
    return this.variants.updateStock(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.PRODUCT_UPDATE)
  @ApiEnvelope(DeletedModel)
  remove(@Param('id', UuidParam) id: string) {
    return this.variants.remove(id);
  }
}
