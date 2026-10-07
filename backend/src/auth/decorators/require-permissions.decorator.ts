import { SetMetadata } from '@nestjs/common';
import type { Permission } from '../permissions';

export const PERMISSIONS_KEY = 'csmju:permissions';

/** ต้องมี permission อย่างน้อยหนึ่งข้อในรายการ — ไม่มี → 403 FORBIDDEN */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
