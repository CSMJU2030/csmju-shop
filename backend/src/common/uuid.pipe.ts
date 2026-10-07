import { ParseUUIDPipe } from '@nestjs/common';

/** path parameter ต้องเป็น UUID v4 — ค่าอื่นตอบ 400 (api-conventions.md ข้อ 1) */
export const UuidParam = new ParseUUIDPipe({ version: '4' });
