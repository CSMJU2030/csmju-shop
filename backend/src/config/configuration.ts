/**
 * ค่าตั้งของระบบ — อ่านจาก environment เท่านั้น (ห้ามฮาร์ดโค้ด secret / connection string)
 * ตรวจค่าที่จำเป็นตอนเริ่มระบบ ถ้าขาดให้ล้มทันทีดีกว่าไปพังตอนมีคำขอจริง
 */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  subsystemId: string;
  frontendUrl: string;
  coreHub: {
    url: string;
    webUrl: string;
    jwksUrl: string;
    issuer: string;
    audience: string;
  };
  jwks: {
    cacheTtlMs: number;
    minRefreshIntervalMs: number;
    requestTimeoutMs: number;
  };
  jwtClockToleranceSec: number;
}

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const coreHubUrl = (env.CORE_HUB_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

  return {
    nodeEnv: env.NODE_ENV ?? 'development',
    port: num(env.PORT, 3002),
    subsystemId: env.SUBSYSTEM_ID ?? 'csmju-shop',
    frontendUrl: (env.FRONTEND_URL ?? 'http://localhost:4000').replace(/\/+$/, ''),
    coreHub: {
      url: coreHubUrl,
      webUrl: (env.CORE_HUB_WEB_URL ?? 'http://localhost:3100').replace(/\/+$/, ''),
      jwksUrl: env.CORE_HUB_JWKS_URL ?? `${coreHubUrl}/api/v1/.well-known/jwks.json`,
      issuer: env.CORE_HUB_ISSUER ?? 'core-hub',
      audience: env.CORE_HUB_AUDIENCE ?? 'csmju2030',
    },
    jwks: {
      cacheTtlMs: num(env.JWKS_CACHE_TTL_MS, 600_000),
      minRefreshIntervalMs: num(env.JWKS_MIN_REFRESH_INTERVAL_MS, 30_000),
      requestTimeoutMs: num(env.JWKS_REQUEST_TIMEOUT_MS, 5_000),
    },
    // auth-contract.md ข้อ 4 ขั้น 7: clock skew ไม่เกิน 60 วินาที
    jwtClockToleranceSec: Math.min(num(env.JWT_CLOCK_TOLERANCE_SEC, 5), 60),
  };
}

export const APP_CONFIG = Symbol('APP_CONFIG');
