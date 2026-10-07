import { Inject, Injectable } from '@nestjs/common';
import { importJWK, type JWK, type KeyLike } from 'jose';
import { APP_CONFIG, type AppConfig } from '../config/configuration';
import { logEvent } from '../common/structured-log';
import { TokenRejectedError } from './auth.errors';

interface CachedKey {
  kid: string;
  key: KeyLike | Uint8Array;
}

/**
 * JWKS client ของ Core Hub (auth-contract.md ข้อ 4.1)
 *
 * - แคชกุญแจ (TTL ตั้งค่าได้ ค่าเริ่มต้น 10 นาที) ไม่ยิง Core Hub ทุก request
 * - เลือกกุญแจจาก header.kid เสมอ (รองรับการหมุนกุญแจ)
 * - เจอ kid ที่ไม่รู้จัก → รีเฟรช JWKS หนึ่งครั้ง แล้วถ้ายังไม่เจอให้ปฏิเสธ
 * - จำกัดอัตรารีเฟรช (≥ 30 วินาทีต่อครั้ง) กัน refresh loop
 * - Core Hub ล่มชั่วคราว → ใช้กุญแจที่แคชไว้ต่อ
 * - ปฏิเสธ JWK ที่มี private material (`d`) หรือไม่ใช่ kty RSA
 */
@Injectable()
export class JwksService {
  private keys = new Map<string, CachedKey>();
  private fetchedAt = 0;
  private lastAttemptAt = 0;
  private inflight: Promise<void> | null = null;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  /** คืนกุญแจสาธารณะของ kid ที่ระบุ — โยน TokenRejectedError ถ้าหาไม่ได้ */
  async getKey(kid: string): Promise<KeyLike | Uint8Array> {
    if (this.isStale() && this.canRefreshNow()) {
      // รีเฟรชไม่สำเร็จ = ใช้กุญแจที่แคชไว้ต่อ (Core Hub ล่มชั่วคราว)
      await this.refresh('cache_expired').catch(() => undefined);
    }

    const cached = this.keys.get(kid);
    if (cached) return cached.key;

    logEvent('jwks.unknown_kid', { kid, knownKids: [...this.keys.keys()] }, 'warn');

    // รีเฟรชหนึ่งครั้งเมื่อเจอ kid ใหม่ แต่ไม่ถี่กว่า min interval
    if (this.canRefreshNow()) {
      await this.refresh('unknown_kid').catch(() => undefined);
      const refreshed = this.keys.get(kid);
      if (refreshed) return refreshed.key;
    }

    throw new TokenRejectedError(this.keys.size === 0 ? 'jwks_unavailable' : 'unknown_kid', kid);
  }

  /** ใช้ในเทสต์ — ล้างแคชทั้งหมด */
  reset(): void {
    this.keys.clear();
    this.fetchedAt = 0;
    this.lastAttemptAt = 0;
    this.inflight = null;
  }

  private isStale(): boolean {
    return this.fetchedAt === 0 || Date.now() - this.fetchedAt > this.config.jwks.cacheTtlMs;
  }

  private canRefreshNow(): boolean {
    return (
      this.lastAttemptAt === 0 ||
      Date.now() - this.lastAttemptAt >= this.config.jwks.minRefreshIntervalMs
    );
  }

  private refresh(reason: string): Promise<void> {
    if (!this.inflight) {
      this.inflight = this.fetchKeys(reason).finally(() => {
        this.inflight = null;
      });
    }
    return this.inflight;
  }

  private async fetchKeys(reason: string): Promise<void> {
    this.lastAttemptAt = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.jwks.requestTimeoutMs);
      let body: unknown;
      try {
        const response = await fetch(this.config.coreHub.jwksUrl, {
          headers: { accept: 'application/json' },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`JWKS HTTP ${response.status}`);
        body = await response.json();
      } finally {
        clearTimeout(timer);
      }

      // RFC 7517 ดิบ: { keys: [...] } ที่ระดับบนสุด ไม่มี envelope
      const rawKeys = (body as { keys?: unknown })?.keys;
      if (!Array.isArray(rawKeys)) throw new Error('JWKS body is not {"keys":[...]}');

      const next = new Map<string, CachedKey>();
      for (const raw of rawKeys as JWK[]) {
        if (!raw || typeof raw !== 'object') continue;
        if (raw.kty !== 'RSA') continue;
        if ('d' in raw || 'p' in raw || 'q' in raw) continue; // private material → ทิ้ง
        if (raw.use && raw.use !== 'sig') continue;
        if (raw.alg && raw.alg !== 'RS256') continue;
        if (typeof raw.kid !== 'string' || raw.kid.length === 0) continue;
        next.set(raw.kid, { kid: raw.kid, key: await importJWK(raw, 'RS256') });
      }

      if (next.size === 0) throw new Error('JWKS has no usable RS256 public key');

      this.keys = next;
      this.fetchedAt = Date.now();
      logEvent('jwks.refresh', { reason, keyCount: next.size, kids: [...next.keys()] });
    } catch (error) {
      logEvent(
        'jwks.refresh.failure',
        {
          reason,
          cachedKeyCount: this.keys.size,
          error: error instanceof Error ? error.message : String(error),
        },
        'warn',
      );
      throw error;
    }
  }
}
