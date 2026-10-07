import { ApiProperty } from '@nestjs/swagger';

export class ProductVariantModel {
  id!: string;
  productId!: string;
  variantName!: string;
  /** ราคาต่อชิ้น หน่วยสตางค์ */
  price!: number;
  /** ติดลบได้เฉพาะสินค้าพรีออเดอร์ (= ยอดที่ต้องสั่งผลิตเพิ่ม) */
  stockQuantity!: number;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ProductModel {
  id!: string;
  name!: string;
  @ApiProperty({ type: String, nullable: true })
  description!: string | null;
  category!: string;
  @ApiProperty({ type: String, nullable: true })
  imageUrl!: string | null;
  isPreorder!: boolean;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  preorderEndDate!: Date | null;
  /** YYYY-MM-DD */
  @ApiProperty({ type: String, format: 'date', nullable: true })
  estimatedDelivery!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  @ApiProperty({ type: () => [ProductVariantModel] })
  variants!: ProductVariantModel[];
}

export class ProductSummaryModel {
  id!: string;
  name!: string;
  category!: string;
  isPreorder!: boolean;
  @ApiProperty({ type: String, nullable: true })
  imageUrl!: string | null;
}

export class VariantWithProductModel extends ProductVariantModel {
  @ApiProperty({ type: () => ProductSummaryModel })
  product!: ProductSummaryModel;
}

export class ProductCategoryModel {
  category!: string;
  productCount!: number;
}

export class ProductImageModel {
  id!: string;
  /** ใส่ค่านี้ใน imageUrl ของสินค้า */
  url!: string;
  contentType!: string;
  size!: number;
}
