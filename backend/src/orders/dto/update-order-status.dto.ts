import { IsIn, IsString, Length } from 'class-validator';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../../common/constants.js';

export class UpdatePaymentStatusDto {
  @IsIn(PAYMENT_STATUSES, {
    message: `payment_status ต้องเป็นหนึ่งใน: ${PAYMENT_STATUSES.join(', ')}`,
  })
  payment_status: string;
}

export class UpdateOrderStatusDto {
  @IsIn(ORDER_STATUSES, {
    message: `order_status ต้องเป็นหนึ่งใน: ${ORDER_STATUSES.join(', ')}`,
  })
  order_status: string;
}

export class UploadSlipDto {
  @IsString({ message: 'ต้องระบุ payment_slip (URL หรือชื่อไฟล์)' })
  @Length(1, 255, { message: 'payment_slip ยาวไม่เกิน 255 ตัวอักษร' })
  payment_slip: string;
}
