import { ApiError } from '../common/api-error';
import { logEvent } from '../common/structured-log';
import type { CoreHubIdentity } from './core-hub-identity';
import type { Permission } from './permissions';

/**
 * ตรวจ ownership กับข้อมูลจริง (authorization.md ข้อ 4)
 * มีสิทธิ์ :any → ผ่าน · มีแค่ :own → ต้องเป็นเจ้าของ (record.core_user_id === token.sub) ไม่งั้น 403
 */
export function assertOwnerOrAny(
  user: CoreHubIdentity,
  ownerCoreUserId: string,
  anyPermission: Permission,
): void {
  if (user.permissions.includes(anyPermission)) return;
  if (ownerCoreUserId === user.coreUserId) return;

  logEvent(
    'authorization.denied',
    {
      sub: user.coreUserId,
      subsystemRole: user.subsystemRole,
      required: [anyPermission],
      reason: 'not_owner',
    },
    'warn',
  );
  throw new ApiError('FORBIDDEN', 'ข้อมูลนี้ไม่ใช่ของคุณ');
}

export function canAny(user: CoreHubIdentity, anyPermission: Permission): boolean {
  return user.permissions.includes(anyPermission);
}
