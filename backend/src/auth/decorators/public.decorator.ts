import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'csmju:isPublic';

/**
 * เส้นทางที่ไม่ต้องมี token — ต้องประกาศใน public_endpoints ของ subsystem.yaml ด้วย
 * มาตรฐาน 1.0 มีแค่ GET /api/health และ GET /auth/callback
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
