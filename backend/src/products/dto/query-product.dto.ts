import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination-query.dto';
import { QueryBoolean } from '../../common/query-boolean';

export class QueryProductDto extends PaginationQueryDto {
  /** กรองตามหมวดหมู่ */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  /** กรองเฉพาะพรีออเดอร์ (true) หรือพร้อมส่ง (false) */
  @IsOptional()
  @QueryBoolean()
  @IsBoolean({ message: 'isPreorder ต้องเป็น true หรือ false' })
  isPreorder?: boolean;

  /** ค้นจากชื่อหรือรายละเอียด */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
