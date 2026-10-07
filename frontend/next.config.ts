import path from "node:path";
import type { NextConfig } from "next";

/**
 * ส่งต่อ /api/* และรูปสินค้า /uploads/* ไปที่ backend (NestJS)
 * เบราว์เซอร์จึงเห็นเป็น origin เดียวกัน คุกกี้ session (core_hub_access_token) ติดไปกับทุกคำขอ
 * หน้าเว็บไม่ต่อฐานข้อมูลเอง (ARC-01) — ข้อมูลทั้งหมดมาจาก API ของ backend
 */
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:5028";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // deployment.md ข้อ 3 (DEP-04): image ใช้เฉพาะ standalone server
  output: "standalone",
  // pnpm เก็บ dependencies ที่รากของ workspace — ต้องเริ่ม trace จากราก repo
  outputFileTracingRoot: path.join(__dirname, ".."),
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      // callback ของ Core Hub (/auth/callback) อยู่ที่ backend — โดเมนเดียวกับหน้าเว็บ เช่น https://csmju-shop.jowave.com/auth/callback
      { source: "/auth/:path*", destination: `${BACKEND_URL}/auth/:path*` },
      { source: "/uploads/:path*", destination: `${BACKEND_URL}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
