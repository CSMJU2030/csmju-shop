import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { ROLES } from '../../common/constants.js';

export class QueryUserDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(ROLES, { message: `role ต้องเป็นหนึ่งใน: ${ROLES.join(', ')}` })
  role?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
