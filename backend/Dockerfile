# API ของระบบย่อย (NestJS + Prisma) — docs/deployment.md ข้อ 3
# build จากรากของ repo เพราะ pnpm workspace เก็บ lockfile ไว้ที่ราก:
#   docker build -f backend/Dockerfile -t csmju-shop-api .
# ห้ามใส่ secret ใน ARG / ENV — DATABASE_URL ส่งตอนรัน container

# ---------- build stage ----------
FROM node:22-alpine AS builder

RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable pnpm

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json backend/
RUN pnpm install --frozen-lockfile --filter backend... \
  && rm -rf /root/.local/share/pnpm/store /root/.cache

COPY backend/ backend/
RUN cd backend && pnpm exec prisma generate && pnpm build

# ---------- runtime stage ----------
FROM node:22-alpine AS runner

RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/backend/node_modules ./backend/node_modules
COPY --from=builder --chown=node:node /app/backend/package.json ./backend/package.json
COPY --from=builder --chown=node:node /app/backend/dist ./backend/dist
COPY --from=builder --chown=node:node /app/backend/prisma ./backend/prisma
COPY --chown=node:node backend/docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh && mkdir -p /app/backend/uploads && chown node:node /app/backend/uploads

USER node
EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4000/api/health >/dev/null || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
