/** @type {import('next').NextConfig} */
const API_TARGET = process.env.API_TARGET || 'http://localhost:3000';

const nextConfig = {
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
