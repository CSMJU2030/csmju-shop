import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { DELIVERY_METHODS, ORDER_STATUSES, PAYMENT_STATUSES } from '../../common/constants.js';

export class QueryOrderDto extends PaginationQueryDto {
  @IsOptional()
  @IsString({ message: 'core_user_id ต้องเป็นข้อความ' })
  core_user_id?: string;

  @IsOptional()
  @IsIn(ORDER_STATUSES, {
    message: `order_status ต้องเป็นหนึ่งใน: ${ORDER_STATUSES.join(', ')}`,
  })
  order_status?: string;

  @IsOptional()
  @IsIn(PAYMENT_STATUSES, {
    message: `payment_status ต้องเป็นหนึ่งใน: ${PAYMENT_STATUSES.join(', ')}`,
  })
  payment_status?: string;

  @IsOptional()
  @IsIn(DELIVERY_METHODS, {
    message: `delivery_method ต้องเป็นหนึ่งใน: ${DELIVERY_METHODS.join(', ')}`,
  })
  delivery_method?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
