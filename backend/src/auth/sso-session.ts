import type { Request } from 'express';

/** ชื่อคุกกี้มาตรฐาน (auth-contract.md ข้อ 5.1) */
export const SESSION_COOKIE = 'core_hub_access_token';

/** อ่าน token จาก Authorization: Bearer ก่อน แล้วจึงคุกกี้ SSO (auth-contract.md ข้อ 6) */
export function extractToken(req: Request): { token: string | null; malformedHeader: boolean } {
  const header = req.headers.authorization;
  if (typeof header === 'string' && header.length > 0) {
    const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
    if (!match) return { token: null, malformedHeader: true };
    return { token: match[1], malformedHeader: false };
  }
  return { token: readCookie(req.headers.cookie, SESSION_COOKIE), malformedHeader: false };
}

export function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      const value = part.slice(index + 1).trim();
      try {
        return value ? decodeURIComponent(value) : null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Set-Cookie ของ session — HttpOnly + SameSite=Lax (+ Secure ตอน production)
 * อายุคุกกี้ไม่เกิน exp ของ token (auth-contract.md ข้อ 5.1)
 */
export function sessionCookie(token: string, exp: number, secure: boolean): string {
  const maxAge = Math.max(0, Math.floor(exp - Date.now() / 1000));
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    `Expires=${new Date(exp * 1000).toUTCString()}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookie(secure: boolean): string {
  const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}
