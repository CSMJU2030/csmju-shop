import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ApiError } from '../../common/api-error';
import { logEvent } from '../../common/structured-log';
import type { CoreHubIdentity } from '../core-hub-identity';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import type { Permission } from '../permissions';

/**
 * Guard ระดับ global ที่ทำงานต่อจาก CoreHubJwtGuard
 * ต้องมี permission อย่างน้อยหนึ่งข้อตาม @RequirePermissions() — ไม่มี → 403 FORBIDDEN
 * (ownership ของ :own ตรวจอีกชั้นใน service กับข้อมูลจริง)
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, targets);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: CoreHubIdentity }>();
    const user = req.user;
    if (!user) throw new ApiError('UNAUTHORIZED', 'กรุณาเข้าสู่ระบบผ่าน Core Hub');

    if (required.some((permission) => user.permissions.includes(permission))) return true;

    logEvent(
      'authorization.denied',
      {
        sub: user.coreUserId,
        subsystemRole: user.subsystemRole,
        required,
        reason: 'missing_permission',
        path: req.path,
      },
      'warn',
    );
    throw new ApiError('FORBIDDEN', 'คุณไม่มีสิทธิ์ทำรายการนี้');
  }
}
