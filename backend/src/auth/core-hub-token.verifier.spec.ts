import { SignJWT, type KeyLike } from 'jose';
import { loadConfig } from '../config/configuration';
import { TokenRejectedError } from './auth.errors';
import { CoreHubTokenVerifier } from './core-hub-token.verifier';
import type { JwksService } from './jwks.service';
import { createTestKeys, type TestKeys } from './test-keys';

const config = loadConfig({});

async function sign(
  keys: TestKeys,
  claims: Record<string, unknown> = {},
  opts: { kid?: string; exp?: string | number; iss?: string; aud?: string; key?: KeyLike } = {},
) {
  const jwt = new SignJWT({ email: 'student@core.local', role: 'student', sid: 's-1', ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: opts.kid ?? keys.kid, typ: 'JWT' })
    .setIssuedAt()
    .setIssuer(opts.iss ?? 'core-hub')
    .setAudience(opts.aud ?? 'csmju2030')
    .setExpirationTime(opts.exp ?? '15m');
  if (!('sub' in claims)) jwt.setSubject('user-002');
  return jwt.sign(opts.key ?? keys.privateKey);
}

function b64(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

async function reason(promise: Promise<unknown>) {
  try {
    await promise;
    return 'accepted';
  } catch (error) {
    return error instanceof TokenRejectedError ? error.reason : `other:${String(error)}`;
  }
}

describe('CoreHubTokenVerifier (auth-contract.md ข้อ 4 — 8 ขั้น)', () => {
  let keys: TestKeys;
  let verifier: CoreHubTokenVerifier;

  beforeAll(async () => {
    keys = await createTestKeys();
    const jwks = {
      getKey: jest.fn((kid: string) =>
        kid === keys.kid
          ? Promise.resolve(keys.publicKey)
          : Promise.reject(new TokenRejectedError('unknown_kid', kid)),
      ),
    } as unknown as JwksService;
    verifier = new CoreHubTokenVerifier(jwks, config);
  });

  it('รับ token ที่ถูกต้องและคืน claim ตามสัญญา', async () => {
    const claims = await verifier.verify(await sign(keys));
    expect(claims).toMatchObject({
      sub: 'user-002',
      role: 'student',
      email: 'student@core.local',
      kid: keys.kid,
    });
  });

  it('ไม่มี token → missing_token', async () => {
    expect(await reason(verifier.verify(undefined))).toBe('missing_token');
  });

  it('รูปแบบไม่ใช่ JWT → malformed_token', async () => {
    expect(await reason(verifier.verify('not-a-jwt'))).toBe('malformed_token');
  });

  it('alg=none → unsupported_algorithm', async () => {
    const token = `${b64({ alg: 'none', kid: keys.kid })}.${b64({ sub: 'user-002', role: 'admin' })}.`;
    expect(await reason(verifier.verify(token))).toBe('unsupported_algorithm');
  });

  it('HS256 → unsupported_algorithm', async () => {
    const token = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS256', kid: keys.kid })
      .setSubject('user-001')
      .sign(new TextEncoder().encode('a-shared-secret-that-must-never-work'));
    expect(await reason(verifier.verify(token))).toBe('unsupported_algorithm');
  });

  it('kid ที่ไม่รู้จัก → unknown_kid', async () => {
    expect(await reason(verifier.verify(await sign(keys, {}, { kid: 'core-hub-1999' })))).toBe(
      'unknown_kid',
    );
  });

  it('ลายเซ็นจากกุญแจอื่น → invalid_signature', async () => {
    const foreign = await createTestKeys();
    expect(await reason(verifier.verify(await sign(keys, {}, { key: foreign.privateKey })))).toBe(
      'invalid_signature',
    );
  });

  it('แก้ payload หลังเซ็น → invalid_signature', async () => {
    const [h, , s] = (await sign(keys)).split('.');
    const tampered = `${h}.${b64({ sub: 'user-002', role: 'admin', iss: 'core-hub', aud: 'csmju2030', exp: 9999999999 })}.${s}`;
    expect(await reason(verifier.verify(tampered))).toBe('invalid_signature');
  });

  it('หมดอายุ → expired', async () => {
    const past = Math.floor(Date.now() / 1000) - 3600;
    expect(await reason(verifier.verify(await sign(keys, {}, { exp: past })))).toBe('expired');
  });

  it('iss ผิด → invalid_issuer', async () => {
    expect(await reason(verifier.verify(await sign(keys, {}, { iss: 'evil-hub' })))).toBe(
      'invalid_issuer',
    );
  });

  it('aud ผิด → invalid_audience', async () => {
    expect(await reason(verifier.verify(await sign(keys, {}, { aud: 'someone-else' })))).toBe(
      'invalid_audience',
    );
  });

  it('ไม่มี sub → invalid_claims', async () => {
    expect(await reason(verifier.verify(await sign(keys, { sub: undefined })))).toBe(
      'invalid_claims',
    );
  });
});
