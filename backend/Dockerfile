# CSMJU Shop backend (NestJS 11 + Prisma 7) — build จากรากของ repo:
#   docker build -f backend/Dockerfile -t csmju-shop-backend .
FROM node:22-slim AS build
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@12.3.4 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/
COPY backend/prisma backend/prisma
COPY backend/prisma.config.ts backend/
RUN pnpm install --frozen-lockfile --filter backend...
COPY backend backend
RUN pnpm --filter backend build && pnpm --filter backend --prod deploy --legacy /out \
  && cp -r backend/dist backend/generated /out/

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out ./
EXPOSE 3002
# ใช้ migration ที่ commit ไว้ แล้วเริ่มระบบ (ไม่รัน migrate dev ใน production)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
