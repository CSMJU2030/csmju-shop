import { mkdirSync } from 'node:fs';
import { RequestMethod, ValidationPipe, type INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { ResponseEnvelopeInterceptor } from './common/response-envelope.interceptor';
import { productImageDir } from './product-images/product-images.controller';

/**
 * ตั้งค่าแอปที่ใช้ร่วมกันระหว่าง main.ts, e2e test และตัวสร้าง openapi.json
 *
 * - global prefix 'api' ตั้งใน main.ts (ธุรกิจอยู่ใต้ /api/v1 ผ่าน @Controller('v1/...'))
 * - /auth/callback อยู่นอก /api (ต้องตรงกับ callback_url ที่ลงทะเบียน)
 */
export const GLOBAL_PREFIX = 'api';
export const GLOBAL_PREFIX_OPTIONS = {
  exclude: [{ path: 'auth/callback', method: RequestMethod.GET }],
};

/** pipe · interceptor · filter กลาง — เรียกหลัง setGlobalPrefix('api', GLOBAL_PREFIX_OPTIONS) */
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      // ข้อมูลไม่ผ่านการตรวจ → 400 VALIDATION_ERROR (api-conventions.md ข้อ 4)
      errorHttpStatusCode: 400,
    }),
  );
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
}

/** เสิร์ฟรูปสินค้าที่อัปโหลดไว้ที่ /uploads/products/* (ไฟล์ ไม่ใช่ endpoint ของ API) */
export function serveUploads(app: NestExpressApplication): void {
  const dir = productImageDir();
  mkdirSync(dir, { recursive: true });
  app.useStaticAssets(dir, { prefix: '/uploads/products', index: false, dotfiles: 'deny' });
}
