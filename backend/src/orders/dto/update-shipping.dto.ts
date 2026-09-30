import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

/**
 * บันทึกข้อมูลการจัดส่งของออร์เดอร์แบบ delivery
 *
 * ส่งค่าว่าง ("") มาในทั้งสองช่อง = ล้างข้อมูลการจัดส่งทิ้ง (กรณีกรอกผิด)
 */
export class UpdateShippingDto {
  /** รหัสบริษัทขนส่ง เช่น thailand_post / flash / kerry หรือจะพิมพ์ชื่อขนส่งเองก็ได้ */
  @IsOptional()
  @IsString({ message: 'shipping_carrier ต้องเป็นข้อความ' })
  @Length(0, 50, { message: 'shipping_carrier ยาวไม่เกิน 50 ตัวอักษร' })
  shipping_carrier?: string;

  @IsOptional()
  @IsString({ message: 'tracking_number ต้องเป็นข้อความ' })
  @Length(0, 50, { message: 'tracking_number ยาวไม่เกิน 50 ตัวอักษร' })
  tracking_number?: string;

  /**
   * true (ค่าเริ่มต้น) = พอใส่เลขพัสดุแล้วเปลี่ยน order_status เป็น shipped ให้เลย
   * ส่ง false ถ้าแค่อยากบันทึกเลขไว้ก่อนแต่ยังไม่ได้เอาของเข้าขนส่ง
   */
  @IsOptional()
  @IsBoolean({ message: 'mark_shipped ต้องเป็น true หรือ false' })
  mark_shipped?: boolean;
}
