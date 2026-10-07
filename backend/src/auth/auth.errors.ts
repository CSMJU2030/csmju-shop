/**
 * เหตุผลที่ token ถูกปฏิเสธ — รายการปิดตาม standards/docs/logging.md ข้อ 2
 * ทุกเหตุผลในไฟล์นี้ตอบ 401 UNAUTHORIZED (auth-contract.md ข้อ 4 และ 8)
 */
export type TokenRejectReason =
  | 'missing_token'
  | 'malformed_token'
  | 'unsupported_algorithm'
  | 'missing_kid'
  | 'unknown_kid'
  | 'jwks_unavailable'
  | 'invalid_signature'
  | 'expired'
  | 'invalid_issuer'
  | 'invalid_audience'
  | 'invalid_claims';

export class TokenRejectedError extends Error {
  constructor(
    readonly reason: TokenRejectReason,
    readonly kid?: string,
  ) {
    super(`token rejected: ${reason}`);
    this.name = 'TokenRejectedError';
  }
}
