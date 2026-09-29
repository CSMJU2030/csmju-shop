import type { NextConfig } from "next";

/**
 * ส่งต่อ /api/* และรูปสินค้า /uploads/* ไปที่ backend (NestJS)
 * เบราว์เซอร์จึงเห็นเป็น origin เดียวกัน คุกกี้ session (core_hub_access_token) ติดไปกับทุกคำขอ
 * หน้าเว็บไม่ต่อฐานข้อมูลเอง (ARC-01) — ข้อมูลทั้งหมดมาจาก API ของ backend
 */
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3002";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      { source: "/uploads/:path*", destination: `${BACKEND_URL}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
