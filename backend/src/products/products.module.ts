import { Module } from '@nestjs/common';
import { ProductCategoriesController, ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController, ProductCategoriesController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
