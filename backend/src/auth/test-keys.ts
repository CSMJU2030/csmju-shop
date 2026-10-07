/* ใช้ในเทสต์เท่านั้น — สร้างคู่กุญแจชั่วคราวและ token ที่เซ็นด้วยกุญแจนั้น (ไม่มีกุญแจจริงใน repo) */
import { exportJWK, generateKeyPair, type JWK, type KeyLike } from 'jose';

export interface TestKeys {
  kid: string;
  privateKey: KeyLike;
  publicKey: KeyLike;
  publicJwk: JWK;
}

export async function createTestKeys(kid = 'core-hub-2026'): Promise<TestKeys> {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const publicJwk = { ...(await exportJWK(publicKey)), kid, alg: 'RS256', use: 'sig' };
  return { kid, privateKey, publicKey, publicJwk };
}
