import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp, GLOBAL_PREFIX_OPTIONS, serveUploads } from './bootstrap';
import { logEvent } from './common/structured-log';
import { loadConfig } from './config/configuration';

async function bootstrap() {
  const config = loadConfig();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.disable('x-powered-by');
  app.enableCors({ origin: config.frontendUrl, credentials: true });
  // ทุก endpoint อยู่ใต้ /api — ยกเว้น GET /auth/callback (api-conventions.md ข้อ 1)
  app.setGlobalPrefix('api', GLOBAL_PREFIX_OPTIONS);
  configureApp(app);
  serveUploads(app);
  app.enableShutdownHooks();

  await app.listen(config.port);

  logEvent('subsystem.started', {
    subsystem: config.subsystemId,
    port: config.port,
    coreHubUrl: config.coreHub.url,
    jwksUrl: config.coreHub.jwksUrl,
    issuer: config.coreHub.issuer,
    audience: config.coreHub.audience,
  });
}

void bootstrap();
