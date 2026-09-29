import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../app.module';
import { configureApp, GLOBAL_PREFIX, GLOBAL_PREFIX_OPTIONS } from '../bootstrap';

/**
 * สร้าง backend/openapi.json จาก decorator ของ controller/DTO (tech-stack.md ข้อ 3)
 * รันได้โดยไม่ต้องมีฐานข้อมูล — CI job API Contract Sync เรียก `pnpm run generate:openapi`
 * แล้วเทียบกับไฟล์ที่ commit ไว้ ผลต้องเหมือนเดิมทุกครั้ง (ไม่มีเวลา/ค่าสุ่มในไฟล์)
 */
async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix(GLOBAL_PREFIX, GLOBAL_PREFIX_OPTIONS);
  configureApp(app);

  const config = new DocumentBuilder()
    .setTitle('CSMJU Shop API')
    .setDescription(
      'ร้านค้าออนไลน์สาขาวิทยาการคอมพิวเตอร์ ม.แม่โจ้ — ทุก endpoint ต้องมี Core Hub token ' +
        '(Authorization: Bearer หรือคุกกี้ core_hub_access_token) ยกเว้น GET /api/health · ' +
        'ทุก response ห่อด้วย { success, data, meta? } · เงินทุกช่องเป็นจำนวนเต็มหน่วยสตางค์',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const target = join(__dirname, '..', '..', '..', 'openapi.json');
  writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
  console.log(`openapi.json → ${target}`);
}

void main();
