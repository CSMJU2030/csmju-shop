/**
 * e2e ผ่าน Nest pipeline จริง (prefix · guard · pipe · interceptor · filter) โดยไม่ต้องมีฐานข้อมูลหรือ Core Hub
 * - JWKS: mock fetch ให้ตอบกุญแจสาธารณะชั่วคราวที่เทสต์สร้างเอง
 * - Prisma: stub เฉพาะเมธอดที่เส้นทางในเทสต์เรียก
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { createTestKeys, type TestKeys } from '../src/auth/test-keys';
import { configureApp, GLOBAL_PREFIX, GLOBAL_PREFIX_OPTIONS } from '../src/bootstrap';
import { PrismaService } from '../src/prisma/prisma.service';

const PRODUCT = {
  id: '5f0c7b2e-3a1d-4c8e-9b6a-2d4e6f8a0b1c',
  name: 'เสื้อโปโล CSMJU',
  description: null,
  category: 'เสื้อผ้า',
  imageUrl: null,
  isPreorder: false,
  preorderEndDate: null,
  estimatedDelivery: null,
  createdAt: new Date('2026-09-01T00:00:00Z'),
  updatedAt: new Date('2026-09-01T00:00:00Z'),
  variants: [],
};

const prismaStub = {
  $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  $disconnect: jest.fn(),
  product: {
    findMany: jest.fn().mockResolvedValue([PRODUCT]),
    count: jest.fn().mockResolvedValue(1),
    findUnique: jest.fn().mockResolvedValue(null),
  },
  order: {
    findUnique: jest.fn().mockResolvedValue({ id: 'x', coreUserId: 'user-999' }),
  },
};

describe('CSMJU Shop API (e2e)', () => {
  let app: INestApplication<App>;
  let keys: TestKeys;
  const realFetch = global.fetch;

  const token = (role: string, sub = 'user-002') =>
    new SignJWT({ email: `${role}@core.local`, role, sid: 's-1' })
      .setProtectedHeader({ alg: 'RS256', kid: keys.kid, typ: 'JWT' })
      .setSubject(sub)
      .setIssuer('core-hub')
      .setAudience('csmju2030')
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(keys.privateKey);

  beforeAll(async () => {
    keys = await createTestKeys();
    global.fetch = jest.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ keys: [keys.publicJwk] }), { status: 200 })),
    );

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(GLOBAL_PREFIX, GLOBAL_PREFIX_OPTIONS);
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    global.fetch = realFetch;
    await app.close();
  });

  it('GET /api/health → 200 public + service name', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toEqual({
      success: true,
      data: { status: 'ok', service: 'csmju-shop', database: 'up' },
    });
  });

  it('ไม่มี token → 401 UNAUTHORIZED', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/products').expect(401);
    expect(res.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('GET /api/v1/me คืนตัวตนจาก token + role ภายในร้าน', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${await token('staff', 'user-003')}`)
      .expect(200);
    expect(res.body.data).toMatchObject({
      id: 'user-003',
      coreRole: 'staff',
      subsystemRole: 'STAFF',
    });
  });

  it('คุกกี้ core_hub_access_token ใช้แทน Bearer ได้', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Cookie', `core_hub_access_token=${await token('student')}`)
      .expect(200);
  });

  it('core role ที่ไม่อยู่ใน mapping → 403 FORBIDDEN', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${await token('guest')}`)
      .expect(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('รายการสินค้า → envelope + meta', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/products?page=1&limit=1')
      .set('Authorization', `Bearer ${await token('student')}`)
      .expect(200);
    expect(res.body).toEqual({
      success: true,
      data: [expect.objectContaining({ id: PRODUCT.id, estimatedDelivery: null })],
      meta: { total: 1, page: 1, limit: 1, totalPages: 1 },
    });
  });

  it('limit ไม่ใช่ตัวเลข → 400 VALIDATION_ERROR', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/products?limit=abc')
      .set('Authorization', `Bearer ${await token('student')}`)
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('id ไม่ใช่ UUID → 400', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/products/not-a-uuid')
      .set('Authorization', `Bearer ${await token('student')}`)
      .expect(400);
  });

  it('ไม่พบสินค้า → 404 NOT_FOUND', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/products/99999999-9999-4999-8999-999999999999')
      .set('Authorization', `Bearer ${await token('student')}`)
      .expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('นักศึกษาเพิ่มสินค้า → 403 ก่อนตรวจ body', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${await token('student')}`)
      .send({ name: 'x', category: 'y' })
      .expect(403);
  });

  it('เจ้าหน้าที่ส่ง body ไม่ครบ → 400 VALIDATION_ERROR', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${await token('staff')}`)
      .send({ name: '' })
      .expect(400);
    expect(res.body.error).toMatchObject({ code: 'VALIDATION_ERROR', details: expect.any(Array) });
  });

  it('นักศึกษาเปิดคำสั่งซื้อของคนอื่น → 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/orders/5f0c7b2e-3a1d-4c8e-9b6a-2d4e6f8a0b1d')
      .set('Authorization', `Bearer ${await token('student', 'user-002')}`)
      .expect(403);
  });

  it('GET /auth/callback ไม่มี token → 401 และไม่มี Set-Cookie', async () => {
    const res = await request(app.getHttpServer()).get('/auth/callback').expect(401);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('GET /auth/callback token ถูกต้อง → คุกกี้ HttpOnly + 302 กลับหน้าเว็บ', async () => {
    const res = await request(app.getHttpServer())
      .get(
        `/auth/callback?access_token=${await token('student')}&token_type=Bearer&expires_in=900&state=abc`,
      )
      .expect(302);
    expect(String(res.headers['set-cookie'])).toMatch(
      /core_hub_access_token=.+HttpOnly; SameSite=Lax/,
    );
    expect(res.headers.location).toBe('http://localhost:4000/?state=abc');
  });

  it('route ที่ไม่มี → 404 พร้อม error envelope', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/__does_not_exist__')
      .set('Authorization', `Bearer ${await token('staff')}`)
      .expect(404);
    expect(res.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
  });
});
