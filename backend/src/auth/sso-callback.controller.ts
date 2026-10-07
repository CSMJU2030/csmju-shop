import { Controller, Get, Inject, Query, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiError } from '../common/api-error';
import { logEvent } from '../common/structured-log';
import { APP_CONFIG, type AppConfig } from '../config/configuration';
import { TokenRejectedError } from './auth.errors';
import { CoreHubTokenVerifier } from './core-hub-token.verifier';
import { Public } from './decorators/public.decorator';
import { mapCoreRole } from './role-mapping';
import { sessionCookie } from './sso-session';

/**
 * GET /auth/callback — ปลายทางของ Central SSO (auth-contract.md ข้อ 5)
 *
 * Core Hub ส่งเบราว์เซอร์มาที่นี่พร้อม ?access_token=…&token_type=Bearer&expires_in=900[&state=…]
 * 1. ตรวจ token ครบ 8 ขั้นก่อนเสมอ — ไม่ผ่านตอบ 401 และไม่มี Set-Cookie
 * 2. แมป role — role ที่ไม่รับตอบ 403
 * 3. ตั้งคุกกี้ HttpOnly ที่เก็บ Core Hub token (อายุไม่เกิน exp) แล้วพากลับหน้าเว็บ
 *
 * อยู่นอก prefix /api และต้องตรงกับ callback_url ที่ลงทะเบียนไว้
 */
@ApiExcludeController()
@Controller('auth')
export class SsoCallbackController {
  constructor(
    private readonly verifier: CoreHubTokenVerifier,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Get('callback')
  async callback(
    @Res() res: Response,
    @Query('access_token') accessToken?: string,
    @Query('state') state?: string,
  ): Promise<void> {
    let claims;
    try {
      claims = await this.verifier.verify(typeof accessToken === 'string' ? accessToken : null);
    } catch (error) {
      const reason = error instanceof TokenRejectedError ? error.reason : 'invalid_claims';
      const kid = error instanceof TokenRejectedError ? (error.kid ?? null) : null;
      logEvent('jwt.verification.failure', { reason, kid, path: '/auth/callback' }, 'warn');
      throw new ApiError(
        'UNAUTHORIZED',
        'เข้าสู่ระบบไม่สำเร็จ: token จาก Core Hub ไม่ถูกต้องหรือหมดอายุ',
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

    logEvent('jwt.verification.success', { sub: claims.sub, coreRole: claims.role, subsystemRole });

    const destination = new URL(`${this.config.frontendUrl}/`);
    if (typeof state === 'string' && state.length > 0 && state.length <= 200) {
      destination.searchParams.set('state', state);
    }

    res.setHeader(
      'Set-Cookie',
      sessionCookie(accessToken as string, claims.exp, this.config.nodeEnv === 'production'),
    );
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, destination.toString());
  }
}
