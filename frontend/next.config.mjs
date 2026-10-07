import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
// ที่อยู่ NestJS API — ถูกฝังตอน next build (deployment.md ข้อ 3.2)
// dev: ตั้ง API_TARGET / BACKEND_URL ใน .env.local · image: frontend/Dockerfile ใช้ http://api:4000
const API_TARGET = process.env.BACKEND_URL || process.env.API_TARGET || 'http://localhost:3000';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  // DEP-04: image ใช้เฉพาะ standalone server
  output: 'standalone',
  // pnpm เก็บ dependencies ที่รากของ workspace
  outputFileTracingRoot: path.join(__dirname, '..'),
  // ส่งต่อ /api/* ไปที่ NestJS — เบราว์เซอร์จึงเห็นเป็น origin เดียวกัน ไม่ต้องตั้ง CORS
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_TARGET}/api/:path*` },
      // รูปสินค้าที่อัปโหลดไว้ถูกเก็บในโฟลเดอร์ของ backend จึงต้องส่งต่อไปเหมือนกัน
      { source: '/uploads/:path*', destination: `${API_TARGET}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
