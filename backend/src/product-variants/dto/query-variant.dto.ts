import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination-query.dto';
import { QueryBoolean } from '../../common/query-boolean';

export class QueryVariantDto extends PaginationQueryDto {
  /** กรองตามสินค้า */
  @IsOptional()
  @IsUUID('4', { message: 'productId ต้องเป็น UUID v4' })
  productId?: string;

  /** เฉพาะตัวเลือกที่ยังมีของ */
  @IsOptional()
  @QueryBoolean()
  @IsBoolean({ message: 'inStock ต้องเป็น true หรือ false' })
  inStock?: boolean;
}
