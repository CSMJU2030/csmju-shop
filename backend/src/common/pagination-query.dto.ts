import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** ?page=&limit= — ค่าเริ่มต้น 1 / 20 · limit สูงสุด 100 (api-conventions.md ข้อ 5) */
export class PaginationQueryDto {
  /** หน้าที่ต้องการ เริ่มที่ 1 */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page ต้องเป็นจำนวนเต็ม' })
  @Min(1, { message: 'page ต้องมากกว่าหรือเท่ากับ 1' })
  page: number = 1;

  /** จำนวนต่อหน้า 1–100 */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit ต้องเป็นจำนวนเต็ม' })
  @Min(1, { message: 'limit ต้องมากกว่าหรือเท่ากับ 1' })
  @Max(100, { message: 'limit สูงสุด 100' })
  limit: number = 20;
}

export function skipOf(query: PaginationQueryDto): number {
  return (query.page - 1) * query.limit;
}
