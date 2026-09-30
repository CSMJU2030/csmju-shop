import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
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

  /** เจ้าหน้าที่ผู้บันทึก — claim `sub` จาก Core Hub */
  @IsString({ message: 'ต้องระบุ staff_core_user_id' })
  @Length(1, 64, { message: 'staff_core_user_id ยาว 1–64 ตัวอักษร' })
  staff_core_user_id: string;

  @IsString({ message: 'ต้องระบุ staff_name' })
  @Length(1, 100, { message: 'staff_name ยาว 1–100 ตัวอักษร' })
  staff_name: string;

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
  @IsString({ message: 'staff_core_user_id ต้องเป็นข้อความ' })
  staff_core_user_id?: string;
}
