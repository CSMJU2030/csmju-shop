import { loadConfig } from '../config/configuration';
import { TokenRejectedError } from './auth.errors';
import { JwksService } from './jwks.service';
import { createTestKeys, type TestKeys } from './test-keys';

describe('JwksService (auth-contract.md ข้อ 4.1)', () => {
  const realFetch = global.fetch;
  let keys: TestKeys;
  let fetchMock: jest.Mock;
  let service: JwksService;

  const respond = (body: unknown, status = 200) =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    );

  beforeAll(async () => {
    keys = await createTestKeys();
  });

  beforeEach(() => {
    fetchMock = jest.fn(() => respond({ keys: [keys.publicJwk] }));
    global.fetch = fetchMock;
    service = new JwksService(loadConfig({ JWKS_MIN_REFRESH_INTERVAL_MS: '30000' }));
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  it('แคชกุญแจ ไม่ยิง Core Hub ทุก request', async () => {
    await service.getKey(keys.kid);
    await service.getKey(keys.kid);
    await service.getKey(keys.kid);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('kid ไม่รู้จัก → รีเฟรชได้ไม่ถี่กว่า min interval แล้วปฏิเสธ', async () => {
    await service.getKey(keys.kid);
    await expect(service.getKey('core-hub-2099')).rejects.toMatchObject({ reason: 'unknown_kid' });
    expect(fetchMock).toHaveBeenCalledTimes(1); // เพิ่งรีเฟรชไป ยังไม่ถึง 30 วินาที
  });

  it('kid ใหม่หลังหมุนกุญแจ → รีเฟรชหนึ่งครั้งแล้วเจอ', async () => {
    service = new JwksService(loadConfig({ JWKS_MIN_REFRESH_INTERVAL_MS: '0' }));
    await service.getKey(keys.kid);
    const rotated = await createTestKeys('core-hub-2027');
    fetchMock.mockImplementation(() => respond({ keys: [keys.publicJwk, rotated.publicJwk] }));
    await expect(service.getKey('core-hub-2027')).resolves.toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('ไม่ยอมรับ JWK ที่มี private material หรือไม่ใช่ RSA', async () => {
    fetchMock.mockImplementation(() =>
      respond({
        keys: [
          { ...keys.publicJwk, d: 'secret' },
          { kty: 'oct', kid: 'x', k: 'abc' },
        ],
      }),
    );
    await expect(service.getKey(keys.kid)).rejects.toBeInstanceOf(TokenRejectedError);
  });

  it('JWKS ที่ห่อ envelope ไม่ใช่ RFC 7517 ดิบ → ใช้ไม่ได้', async () => {
    fetchMock.mockImplementation(() =>
      respond({ success: true, data: { keys: [keys.publicJwk] } }),
    );
    await expect(service.getKey(keys.kid)).rejects.toMatchObject({ reason: 'jwks_unavailable' });
  });

  it('Core Hub ล่มชั่วคราว → ใช้กุญแจที่แคชไว้ต่อ', async () => {
    service = new JwksService(
      loadConfig({ JWKS_CACHE_TTL_MS: '0', JWKS_MIN_REFRESH_INTERVAL_MS: '0' }),
    );
    await service.getKey(keys.kid);
    fetchMock.mockImplementation(() => Promise.reject(new Error('ECONNREFUSED')));
    await expect(service.getKey(keys.kid)).resolves.toBeDefined();
  });
});
