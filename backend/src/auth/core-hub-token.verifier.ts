import { Inject, Injectable } from '@nestjs/common';
import { decodeProtectedHeader, errors as joseErrors, jwtVerify } from 'jose';
import { APP_CONFIG, type AppConfig } from '../config/configuration';
import { TokenRejectedError } from './auth.errors';
import type { VerifiedCoreHubClaims } from './core-hub-identity';
import { JwksService } from './jwks.service';

const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;

/**
 * ตรวจ Core Hub access token ครบ 8 ขั้น (auth-contract.md ข้อ 4)
 *
 *  1 มี token          2 ถอด header (alg, kid)     3 alg ต้องเป็น RS256
 *  4 หา key จาก JWKS    5 ตรวจลายเซ็น (allow-list RS256 ซ้ำ)
 *  6 ตรวจ iss / aud     7 ตรวจ exp (clock skew ≤ 60s)   8 ต้องมี sub
 *
 * ไม่มีทางลัด ไม่มีโหมด dev ที่ข้ามขั้น — ไม่ผ่านขั้นใดโยน TokenRejectedError (→ 401)
 */
@Injectable()
export class CoreHubTokenVerifier {
  constructor(
    private readonly jwks: JwksService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async verify(token: string | undefined | null): Promise<VerifiedCoreHubClaims> {
    // 1
    if (!token) throw new TokenRejectedError('missing_token');
    if (!JWT_SHAPE.test(token)) throw new TokenRejectedError('malformed_token');

    // 2
    let header: { alg?: string; kid?: string };
    try {
      header = decodeProtectedHeader(token);
    } catch {
      throw new TokenRejectedError('malformed_token');
    }

    // 3
    if (header.alg !== 'RS256') throw new TokenRejectedError('unsupported_algorithm', header.kid);
    if (!header.kid) throw new TokenRejectedError('missing_kid');

    // 4
    const key = await this.jwks.getKey(header.kid);

    // 5 · 6 · 7
    let payload: Record<string, unknown>;
    try {
      const result = await jwtVerify(token, key, {
        algorithms: ['RS256'],
        issuer: this.config.coreHub.issuer,
        audience: this.config.coreHub.audience,
        clockTolerance: this.config.jwtClockToleranceSec,
        requiredClaims: ['exp'],
      });
      payload = result.payload;
    } catch (error) {
      throw new TokenRejectedError(this.reasonOf(error), header.kid);
    }

    // 8
    const sub = payload.sub;
    if (typeof sub !== 'string' || sub.trim().length === 0) {
      throw new TokenRejectedError('invalid_claims', header.kid);
    }
    if (typeof payload.role !== 'string' || payload.role.length === 0) {
      throw new TokenRejectedError('invalid_claims', header.kid);
    }

    return {
      sub,
      email: typeof payload.email === 'string' ? payload.email : '',
      role: payload.role,
      sid: typeof payload.sid === 'string' ? payload.sid : undefined,
      exp: Number(payload.exp),
      kid: header.kid,
    };
  }

  private reasonOf(error: unknown): TokenRejectedError['reason'] {
    if (error instanceof joseErrors.JWTExpired) return 'expired';
    if (error instanceof joseErrors.JWTClaimValidationFailed) {
      if (error.claim === 'iss') return 'invalid_issuer';
      if (error.claim === 'aud') return 'invalid_audience';
      return 'invalid_claims';
    }
    if (error instanceof joseErrors.JWSSignatureVerificationFailed) return 'invalid_signature';
    if (error instanceof joseErrors.JOSEAlgNotAllowed) return 'unsupported_algorithm';
    if (error instanceof joseErrors.JWSInvalid || error instanceof joseErrors.JWTInvalid) {
      return 'malformed_token';
    }
    return 'invalid_signature';
  }
}
