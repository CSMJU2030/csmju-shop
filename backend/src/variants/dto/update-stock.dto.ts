import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/** ปรับสต็อก: ใช้ adjust (บวก/ลบ) หรือ set (กำหนดค่าตรง) อย่างใดอย่างหนึ่ง */
export class UpdateStockDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'adjust ต้องเป็นจำนวนเต็ม (บวกหรือลบ)' })
  adjust?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'set ต้องเป็นจำนวนเต็ม' })
  @Min(0, { message: 'set ต้องไม่ติดลบ' })
  set?: number;
}
