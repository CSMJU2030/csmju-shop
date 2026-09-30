import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class CreatePickupLogDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'order_id ต้องเป็นจำนวนเต็ม' })
  @Min(1)
  order_id?: number;

  @IsOptional()
  @IsString({ message: 'pickup_code ต้องเป็นข้อความ' })
  pickup_code?: string;

  @Type(() => Number)
  @IsInt({ message: 'ต้องระบุ staff_id เป็นจำนวนเต็ม' })
  @Min(1, { message: 'staff_id ไม่ถูกต้อง' })
  staff_id: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class VerifyPickupCodeDto {
  @IsString({ message: 'ต้องระบุ pickup_code' })
  pickup_code: string;
}

export class QueryPickupLogDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'order_id ต้องเป็นจำนวนเต็ม' })
  @Min(1)
  order_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'staff_id ต้องเป็นจำนวนเต็ม' })
  @Min(1)
  staff_id?: number;
}
