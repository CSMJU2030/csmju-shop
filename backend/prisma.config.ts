import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 configuration.
 *
 * แนบ datasource เฉพาะตอนมี DATABASE_URL จริง — `prisma generate` รันจาก postinstall
 * บน CI ก่อนจะมี `.env` ถ้าใช้ env('DATABASE_URL') ตรง ๆ pnpm install จะล้ม
 * (standards/docs/aie-workflow.md หัวข้อ "กับดักที่เจอจริงมาแล้ว")
 */
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node --transpile-only prisma/seed.ts',
  },
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),
});
