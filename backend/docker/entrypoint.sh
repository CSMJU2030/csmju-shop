#!/bin/sh
# สร้าง/อัปเดตตารางก่อนเปิด API (deployment.md ข้อ 3.1)
set -e
cd /app/backend
npx prisma migrate deploy
exec node dist/main.js
