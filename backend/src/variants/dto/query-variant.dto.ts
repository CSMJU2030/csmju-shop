import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class QueryVariantDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'product_id ต้องเป็นจำนวนเต็ม' })
  @Min(1)
  product_id?: number;

  @IsOptional()
  @Transform(({ value }) =>
    ['true', '1', 'yes', true].includes(typeof value === 'string' ? value.toLowerCase() : value),
  )
  @IsBoolean()
  in_stock?: boolean;
}
