import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ApiError } from '../../common/api-error';
import { logEvent } from '../../common/structured-log';
import { TokenRejectedError } from '../auth.errors';
import { CoreHubTokenVerifier } from '../core-hub-token.verifier';
import type { CoreHubIdentity, CoreRole } from '../core-hub-identity';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { permissionsFor } from '../permissions';
import { mapCoreRole } from '../role-mapping';
import { extractToken } from '../sso-session';

/**
 * Guard ระดับ global — ทุกเส้นทางต้องมี Core Hub token เว้นแต่ติด @Public()
 *
 * token ไม่ผ่าน (ไม่มี / เสีย / หมดอายุ / kid ไม่รู้จัก ...) → 401 UNAUTHORIZED
 * token ถูกต้องแต่ core role ไม่อยู่ใน role mapping          → 403 FORBIDDEN
 */
@Injectable()
export class CoreHubJwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: CoreHubTokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: CoreHubIdentity }>();
    const { token, malformedHeader } = extractToken(req);

    let claims;
    try {
      if (malformedHeader) throw new TokenRejectedError('malformed_token');
      claims = await this.verifier.verify(token);
    } catch (error) {
      const reason = error instanceof TokenRejectedError ? error.reason : 'invalid_claims';
      const kid = error instanceof TokenRejectedError ? (error.kid ?? null) : null;
      logEvent('jwt.verification.failure', { reason, kid, path: req.path }, 'warn');
      throw new ApiError(
        'UNAUTHORIZED',
        reason === 'expired'
          ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบผ่าน Core Hub อีกครั้ง'
          : 'ไม่พบ token หรือ token ไม่ถูกต้อง กรุณาเข้าสู่ระบบผ่าน Core Hub',
      );
    }

    const subsystemRole = mapCoreRole(claims.role);
    if (!subsystemRole) {
      logEvent(
        'authorization.role_mapping_failed',
        { sub: claims.sub, coreRole: claims.role },
        'warn',
      );
      throw new ApiError(
        'FORBIDDEN',
        `บทบาท "${claims.role}" ไม่มีสิทธิ์เข้าใช้ร้านค้า CSMJU Shop`,
      );
    }

    req.user = {
      coreUserId: claims.sub,
      email: claims.email,
      coreRole: claims.role.toLowerCase() as CoreRole,
      subsystemRole,
      permissions: permissionsFor(subsystemRole),
      exp: claims.exp,
    };

    logEvent('jwt.verification.success', {
      sub: claims.sub,
      coreRole: claims.role,
      subsystemRole,
    });
    return true;
  }
}
