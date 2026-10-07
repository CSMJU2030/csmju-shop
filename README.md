# csmju-shop

CSMJU Shop — ระบบย่อยของโครงการ CSMJU2030

มาตรฐานกลางอยู่ใน `standards/` (submodule ของ CSMJU2030/csmju2030-standards)
สร้างจาก standards v1.0.0

## เริ่มทำงาน

```bash
git submodule update --init --remote standards/
pnpm install
git checkout -b feature/shop/<เรื่องที่ทำ>
```

ก่อนเปิด PR อ่าน `standards/docs/github-workflow.md` ข้อ 1

> ปัจจุบันผูก standards **1.0.6** (สาย 1.0.x ใช้สัญญา SSO 1.0 ตรงกับ Core Hub `main`) ·
> ถ้าคำสั่ง `--remote` ด้านบนเลื่อน submodule ไปที่ `main` ของ standards ห้าม commit ผลนั้น —
> submodule ต้องชี้ tag เดียวกับ `.standards-version` (กฎ `GH-04` ดู `standards/docs/standards-versioning.md` ข้อ 3)
> ให้ใช้ `git submodule update --init standards/` แทน

---

## โครงสร้าง

```text
csmju-shop/
├── backend/                 NestJS 11 + Prisma 7.9.1 (PrismaPg) + PostgreSQL · รันที่ :5028
│   ├── src/auth/            ตรวจ Core Hub JWT ผ่าน JWKS (jose) · role mapping · permission · /auth/callback · /api/v1/me
│   ├── src/common/          envelope { success, data, meta } · exception filter (error code 7 ค่า) · pagination
│   ├── src/products/ · product-variants/ · product-images/     สินค้า ตัวเลือก สต็อก รูป
│   ├── src/orders/ · order-items/ · order-stats/ · pickup-logs/ คำสั่งซื้อ รายการ สรุปยอด การรับสินค้า
│   ├── prisma/              schema.prisma · migrations/ · seed.ts
│   └── openapi.json         สัญญา API (สร้างจากโค้ดด้วย pnpm --filter backend generate:openapi)
├── frontend/                Next.js 16 App Router + TypeScript + Tailwind v4 · รันที่ :3228
│   ├── src/csmju/ · src/app/globals.css   ของกลางจาก template csmju-subsystem-web (ห้ามแก้)
│   ├── src/app/             หน้า: ร้านค้า · ตะกร้า · คำสั่งซื้อของฉัน · หลังร้าน (/staff/*)
│   └── src/lib/api-types.ts type ที่สร้างจาก backend/openapi.json (pnpm --filter frontend generate:api-types)
├── subsystem.yaml · .standards-version · standards/ (submodule)
└── docker-compose.yml       PostgreSQL ของร้าน (shop_db) + backend
```

## ติดตั้งและรันบนเครื่อง

ต้องมี Node.js 22 · pnpm 12.3.4 (`corepack enable pnpm`) · PostgreSQL 16+ · Core Hub รันอยู่ที่ :3000 (API) และ :3100 (เว็บ)

```bash
git submodule update --init standards/
pnpm install

# 1) ฐานข้อมูลของร้าน (เลือกอย่างใดอย่างหนึ่ง)
createdb -U postgres shop_db                 # PostgreSQL ในเครื่อง
docker compose up -d db                      # หรือใช้ Docker (localhost:5434 · ตั้ง SHOP_DB_PASSWORD ใน .env ก่อน)

# 2) ค่าตั้ง (ใส่รหัสผ่านจริงในไฟล์ .env ของเครื่องเท่านั้น)
cp backend/.env.example backend/.env         # แก้ DATABASE_URL
cp frontend/.env.example frontend/.env.local

# 3) สร้างตาราง + ข้อมูลตัวอย่าง
pnpm --filter backend db:deploy
pnpm --filter backend db:seed                # ล้างข้อมูลเดิมใน shop_db แล้วใส่สินค้าตัวอย่าง

# 4) รัน
pnpm --filter backend start:dev              # http://localhost:5028/api/health
pnpm --filter frontend dev                   # http://localhost:3228
```

### ลงทะเบียนร้านค้ากับ Core Hub (ครั้งแรกครั้งเดียว · ต้องใช้บัญชี admin ของ Core Hub)

```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@core.local","password":"<รหัสผ่าน admin>"}' | jq -r .data.access_token)

curl -s -X POST http://localhost:3000/api/v1/subsystems -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"csmju-shop","displayName":"CSMJU Shop","owner":"admin","repo":"CSMJU2030/csmju-shop","standardsVersion":"1.0.6","callbackUrl":"http://localhost:5028/auth/callback","defaultRoleMapping":{"student":"STUDENT","alumni":"ALUMNI","staff":"STAFF","admin":"ADMIN"},"requestedExceptions":[]}'
# นำ id ที่ได้ไป approve แล้ว activate
curl -s -X POST http://localhost:3000/api/v1/subsystems/<id>/approve  -H "Authorization: Bearer $ADMIN_TOKEN"
curl -s -X POST http://localhost:3000/api/v1/subsystems/<id>/activate -H "Authorization: Bearer $ADMIN_TOKEN"
```

`defaultRoleMapping` ต้องตรงกับ `backend/src/auth/role-mapping.ts` เป๊ะ

### เข้าสู่ระบบ

ร้านค้าไม่มีหน้า login ของตัวเอง เปิด http://localhost:3228 แล้วระบบจะพาไปเข้าสู่ระบบที่ Core Hub
(`{CORE_HUB_WEB_URL}/api/sso/csmju-shop`) → Core Hub ส่งกลับมาที่ `http://localhost:5028/auth/callback`
→ backend ตรวจ token แล้วตั้งคุกกี้ `core_hub_access_token` (HttpOnly) → กลับหน้าร้าน

## ทดสอบ

```bash
rm -rf frontend/.next && pnpm -r lint && pnpm -r typecheck && pnpm -r test && pnpm -r build
./standards/scripts/run-all-checks.sh .      # static เหมือน CI
node standards/conformance/run.js            # runtime (ต้องรัน Core Hub + backend ไว้ก่อน)
```

ผลรันล่าสุดดูที่ `REPORT.md`
