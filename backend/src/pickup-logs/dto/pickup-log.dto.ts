import { IsNotEmpty, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination-query.dto';

/** บันทึกการส่งมอบ — ผู้บันทึกคือเจ้าหน้าที่ที่ login อยู่ (ไม่รับ id เจ้าหน้าที่จาก body) */
export class CreatePickupLogDto {
  /** id ของคำสั่งซื้อ (ส่งอย่างใดอย่างหนึ่งกับ pickupCode) */
  @IsOptional()
  @IsUUID('4', { message: 'orderId ต้องเป็น UUID v4' })
  orderId?: string;

  /** รหัสรับสินค้า เช่น PICKUP-123456 */
  @IsOptional()
  @IsString({ message: 'pickupCode ต้องเป็นข้อความ' })
  @Length(1, 50)
  pickupCode?: string;

  /** หมายเหตุ */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreatePickupVerificationDto {
  /** รหัสรับสินค้าที่ลูกค้าแสดง (สแกนจาก QR ได้) */
  @IsString({ message: 'ต้องระบุ pickupCode' })
  @IsNotEmpty({ message: 'ต้องระบุ pickupCode' })
  @Length(1, 50)
  pickupCode!: string;
}

export class QueryPickupLogDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'orderId ต้องเป็น UUID v4' })
  orderId?: string;

  /** กรองตามเจ้าหน้าที่ผู้บันทึก (core_user_id) */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  staffCoreUserId?: string;
}
