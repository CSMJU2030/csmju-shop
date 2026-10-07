import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DeliveryMethod, OrderStatus, PaymentStatus } from '../../../generated/prisma/enums';
import { PaginationQueryDto } from '../../common/pagination-query.dto';
import { QueryBoolean } from '../../common/query-boolean';

export class QueryOrderDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus, { message: 'orderStatus ไม่ถูกต้อง' })
  orderStatus?: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentStatus, { message: 'paymentStatus ไม่ถูกต้อง' })
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsEnum(DeliveryMethod, { message: 'deliveryMethod ไม่ถูกต้อง' })
  deliveryMethod?: DeliveryMethod;

  /** ค้นจากเลขที่คำสั่งซื้อ รหัสรับสินค้า เลขพัสดุ ชื่อหรืออีเมลผู้สั่ง */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  /** เลขที่คำสั่งซื้อแบบตรงตัว เช่น ORD-202609-0001 */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  orderNumber?: string;

  /** true = เฉพาะคำสั่งซื้อของฉัน (เจ้าหน้าที่ใช้ดูของตัวเอง) */
  @IsOptional()
  @QueryBoolean()
  @IsBoolean({ message: 'mine ต้องเป็น true หรือ false' })
  mine?: boolean;
}
