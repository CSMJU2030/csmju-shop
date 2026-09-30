import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto.js';

/** ทุกฟิลด์เป็น optional — ส่งเฉพาะที่ต้องการแก้ */
export class UpdateUserDto extends PartialType(CreateUserDto) {}
