import { IsInt, IsOptional, Min } from 'class-validator';

/** ปรับสต็อก: ส่ง adjust (บวก/ลบ) หรือ set (กำหนดค่าตรง) อย่างใดอย่างหนึ่ง */
export class UpdateStockDto {
  /** จำนวนที่เพิ่ม (บวก) หรือลด (ลบ) */
  @IsOptional()
  @IsInt({ message: 'adjust ต้องเป็นจำนวนเต็ม (บวกหรือลบ)' })
  adjust?: number;

  /** กำหนดจำนวนคงเหลือใหม่ */
  @IsOptional()
  @IsInt({ message: 'set ต้องเป็นจำนวนเต็ม' })
  @Min(0, { message: 'set ต้องไม่ติดลบ' })
  set?: number;
}
