import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class QueryProductDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return ['true', '1', 'yes', true].includes(
      typeof value === 'string' ? value.toLowerCase() : value,
    );
  })
  @IsBoolean({ message: 'is_preorder ต้องเป็น true หรือ false' })
  is_preorder?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}
