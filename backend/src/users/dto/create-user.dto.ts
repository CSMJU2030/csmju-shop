import { IsIn, IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ROLES } from '../../common/constants.js';

export class CreateUserDto {
  @IsOptional()
  @IsString({ message: 'student_id ต้องเป็นข้อความ' })
  @Length(1, 20, { message: 'student_id ยาวไม่เกิน 20 ตัวอักษร' })
  student_id?: string;

  @IsString({ message: 'ต้องระบุ fullname' })
  @Length(1, 100, { message: 'fullname ยาวไม่เกิน 100 ตัวอักษร' })
  fullname: string;

  @IsEmail({}, { message: 'email ไม่ถูกต้อง' })
  @Length(1, 100, { message: 'email ยาวไม่เกิน 100 ตัวอักษร' })
  email: string;

  @IsString({ message: 'ต้องระบุ phone' })
  @Matches(/^[0-9+\-\s]{9,15}$/, { message: 'phone ต้องเป็นตัวเลข 9-15 หลัก' })
  phone: string;

  @IsOptional()
  @IsIn(ROLES, { message: `role ต้องเป็นหนึ่งใน: ${ROLES.join(', ')}` })
  role?: string;
}
