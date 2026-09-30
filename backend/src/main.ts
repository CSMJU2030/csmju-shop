import 'reflect-metadata';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  app.enableCors();

  // เสิร์ฟรูปที่อัปโหลดไว้ — เปิดดูได้ที่ http://localhost:3000/uploads/products/xxx.jpg
  // อยู่นอก prefix /api เพราะเป็นไฟล์ ไม่ใช่ endpoint
  const uploadsDir = join(process.cwd(), 'uploads');
  mkdirSync(join(uploadsDir, 'products'), { recursive: true });
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  // ทุก endpoint อยู่ใต้ /api ยกเว้นหน้าแรกที่บอกข้อมูล API
  app.setGlobalPrefix('api', { exclude: [{ path: '/', method: RequestMethod.GET }] });

  // ตรวจ request body/query ตาม DTO อัตโนมัติ
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // ตัดฟิลด์ที่ไม่ได้ประกาศใน DTO ทิ้ง
      transform: true, // แปลงชนิดข้อมูลตาม @Type()
      transformOptions: { enableImplicitConversion: false },
      errorHttpStatusCode: 422, // ข้อมูลไม่ผ่านการตรวจ → 422
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);

  logger.log(`CSMJU-Shop API ทำงานที่ http://localhost:${port}`);
  logger.log(`Health check: http://localhost:${port}/api/health`);
}

bootstrap();
