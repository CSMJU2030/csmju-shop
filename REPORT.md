# REPORT — csmju-shop

งาน: นำโมดูลร้านค้าเดิมของ AIE (NestJS 12 + Prisma 6 + Next.js JavaScript) เข้าโครง repository ของ PM
แล้วเชื่อมกับ Core Hub ตาม `AIE_CORE_HUB_INTEGRATION_WORKFLOW_TH.md` · branch `feature/shop/core-hub`

## ผลรัน

`./standards/scripts/run-all-checks.sh .` (standards 1.0.6 · รันบนสำเนาที่ไม่มีไฟล์ `.env`)

```
  ✅ PASS  API Contract Sync           check-api-conventions.sh
  ✅ PASS  Data Dictionary Compliance  check-field-aliases.sh
  ✅ PASS  Data Dictionary Compliance  check-snake-case.sh
  ✅ PASS  Data Dictionary Compliance  check-no-hardcoded-faculty.sh
  ✅ PASS  Data Dictionary Compliance  check-money-fields.sh
  ✅ PASS  UI Token Compliance         check-ui-tokens.sh
  ✅ PASS  Code Quality                check-qa.sh
  ✅ PASS  Exception Validation        check-exceptions.sh

✅ All 19 checks passed.
```

> หลัง commit แล้ว ถ้ารัน `check-ci-untouched.sh` ของ 1.0.6 ในเครื่อง `GH-03` จะฟ้องว่าแก้ `standards` —
> บน CI กฎ `GH-03` และ `GH-04` มาจากตัวกลาง v1.5.2 (ตามที่ `ci.yml` ปักไว้) ซึ่งอนุญาตให้ทีมเลื่อน submodule เอง
> ทดสอบด้วยสคริปต์ v1.5.2 แล้วผ่าน: `✅ [GH-03] ไม่มีการแก้ไขไฟล์ CI`

`node standards/conformance/run.js` (Core Hub `main` a1df242 + backend ร้านค้า + PostgreSQL 16)

```
── L3 · SSO — rejected handoffs
  PASS  L3-12      callback with a tampered token → 401
  PASS  L3-13      no session cookie is issued for a rejected token
  PASS  L3-14      callback without a token → 400 or 401
  PASS  L3-15      Core Hub rejects an unregistered callback_url

────────────────────────────────────────────────────────────
RESULT: 62 passed · 0 failed · 0 skipped
✅ CONFORMANT — csmju-shop meets standard v1.0 L3
```

ชุดทดสอบของโปรเจกต์: backend unit 35 · backend e2e 15 (ไม่ต้องมีฐานข้อมูล/Core Hub) · frontend unit 6 ·
`pnpm -r lint` · `pnpm -r typecheck` · `pnpm -r build` ผ่านทั้งหมด · log ของ backend ไม่มี token (`grep eyJ` = 0)

ทดสอบหน้าจอด้วย Playwright (Chromium) ที่ 360px และ 1280px ทุกหน้า: ไม่มี horizontal scroll ·
สั่งซื้อผ่านหน้าเว็บจนได้บัตรรับสินค้า · เจ้าหน้าที่ยืนยันชำระเงิน → ตรวจรหัส → บันทึกส่งมอบผ่าน API

## ไฟล์ที่สร้าง/แก้ไข

**ค่าตั้งของ PM ที่แก้ (ต้องให้ PL/PM ตรวจ)**
- `.standards-version` + `standards/` — เลื่อน 1.0.0 → 1.0.6 (สาย SSO 1.0 เดียวกับ Core Hub `main` · เพื่อใช้ `qrcode.react` และ Tailwind v4 ที่ whitelist อนุญาตตั้งแต่ 1.0.2)
- `package.json` — `packageManager` เป็น `pnpm@12.3.4` ตาม tech-stack 1.0.3+
- `pnpm-workspace.yaml` — เพิ่ม `allowBuilds` (pnpm 12 บล็อก build script ของ Prisma) ตั้งแบบเดียวกับ Core Hub
- `subsystem.yaml` — กรอก `probes` ให้ conformance (ไม่มี SKIP) · ไฟล์นี้ CODEOWNERS กำหนดให้ DevOps/PM approve
- `.env.example` — ค่าตัวอย่างของร้าน (ไม่มีรหัสผ่านจริง) · `README.md` — เพิ่มวิธีติดตั้ง/รัน/ทดสอบ
- ไม่ได้แก้ `.github/` · `CODEOWNERS` · ไฟล์ใน `standards/`

**backend/** (ย้ายจากโมดูลเดิมและปรับเข้ามาตรฐาน)
- NestJS 12 → 11 · Prisma 6 → 7.9.1 + `PrismaPg` · npm → pnpm · ESM → CommonJS ตาม Core Hub
- `prisma/schema.prisma` — UUID ทุกตาราง · field camelCase + คอลัมน์ snake_case (`@map`) · เงินเป็นสตางค์ (Int) · enum สถานะ ·
  `created_at`/`updated_at` ทุกตาราง · **ลบตาราง `users`** ใช้ `core_user_id` (DD-01) · `migrations/…_init` ใหม่สำหรับ `shop_db`
- API ย้ายจาก `/api/<res>` → `/api/v1/<res>` · envelope `{ success, data, meta }` · error code 7 ค่า · 400 แทน 422 ·
  PATCH แทน PUT · DELETE ตอบ `{ id, deleted: true }` · path param ต้องเป็น UUID v4
  (`products` · `product-categories` · `product-variants` · `product-images` · `orders` · `order-items` · `order-stats` · `pickup-logs` · `pickup-verifications` · `me`)
- ตัดสิทธิ์ที่ไม่ปลอดภัยของเดิม: ไม่รับ `user_id` / `staff_id` / `shipping_fee` จาก body (ตัวตนมาจาก token · ค่าส่งคิดฝั่ง server)
- เพิ่มกฎธุรกิจ: ตัดสต็อกแบบมีเงื่อนไขกันขายเกิน · ยกเลิกคำสั่งซื้อแล้วคืนสต็อก · ห้ามเปลี่ยนสถานะหลัง COMPLETED/CANCELLED ·
  ปิดรับพรีออเดอร์ตาม `preorderEndDate` · ห้ามส่งมอบซ้ำ · ตรวจลายเซ็นไฟล์รูปก่อนบันทึก
- `openapi.json` สร้างจาก decorator (`pnpm --filter backend generate:openapi`) รวม schema ของ response
- `Dockerfile` + `docker-compose.yml` ที่ราก

**frontend/**
- JavaScript → TypeScript · Next.js 16 App Router · ของกลางจาก template `csmju-subsystem-web` (`src/csmju/`, `src/app/globals.css`, โลโก้) ไม่แก้
- ทุกหน้าอยู่ใน `CsmjuAppShell` · สีจาก token เท่านั้น · 4 สถานะ (skeleton/empty/error/success) · `loading.tsx`/`error.tsx` ทุก route
- type ของ API สร้างจาก `openapi.json` (`src/lib/api-types.ts`) · วันที่ พ.ศ./Asia/Bangkok · เงินหาร 100
- หน้า: ร้านค้า · ตะกร้า/สั่งซื้อ · คำสั่งซื้อของฉัน (ใหม่) · บัตรรับสินค้า (QR) · หลังร้าน: ภาพรวม · คำสั่งซื้อ · สินค้า · สต็อกและพรีออเดอร์ · จุดรับสินค้า (สแกน QR)
- ไม่ย้าย `_old-vite/`, `_old-express/`, `API.md`, `POSTMAN.md`, `TESTCASES.md`, Postman collection ของเดิม (ใช้ API เก่าที่ไม่มีแล้ว — สัญญาใหม่อยู่ใน `openapi.json`)

## ชั้น auth

- **ไม่ได้คัดลอกจาก `demo-student-subsystem`** — repo นั้นเป็น private และ AIE ยังไม่มีสิทธิ์อ่าน
  จึงเขียนตาม `auth-contract.md` ข้อ 4–6 และโครงไฟล์ตาม `repo-structure.md` ข้อ 2:
  `jwks.service.ts` · `core-hub-token.verifier.ts` (8 ขั้น · `jose`) · `auth.errors.ts` · `core-hub-identity.ts` ·
  `guards/` (CoreHubJwtGuard 401 · PermissionsGuard 403) · `decorators/` (@Public · @RequirePermissions · @CurrentUser) ·
  `sso-callback.controller.ts` · `sso-session.ts` · `me.controller.ts` · `role-mapping.ts` · `permissions.ts`
- **PL ต้องตรวจเทียบกับ reference implementation** — ถ้าได้สิทธิ์อ่าน demo แล้ว ให้แทนที่ด้วยไฟล์ของ demo ตาม `ai/AGENTS.md` ข้อ 2 (ชื่อไฟล์ตั้งไว้ตรงกันแล้ว)
- ผ่าน conformance L1-17…27 (token ปลอมทุกแบบ → 401) และ L3 ครบ

## Role mapping (ต้องตรงกับ default_role_mapping ในทะเบียน)

| core role | subsystem role | สิทธิ์หลัก |
|---|---|---|
| student | STUDENT | ดูสินค้า · สั่งซื้อ · ดู/แนบสลิปคำสั่งซื้อของตัวเอง |
| alumni | ALUMNI | เหมือน STUDENT |
| staff | STAFF | + จัดการสินค้า/สต็อก · ทุกคำสั่งซื้อ · ส่งมอบสินค้า · สรุปยอด |
| admin | ADMIN | + ลบสินค้า/คำสั่งซื้อ/บันทึกการรับ |

`lecturer` และ `guest` (มาตรฐาน 1.0.6) ยังไม่เปิด เพราะ Core Hub `main` ยังไม่มี role นี้ — ผู้ใช้ role นั้นได้ 403

## ข้อสมมติที่ตั้งเอง (เพราะมาตรฐานไม่ได้ระบุ)

1. ชื่อผู้รับ/เบอร์โทรเก็บเป็น local data ในคำสั่งซื้อ (`recipient_name`, `recipient_phone`) เพราะ Core Hub v1.0 ไม่มี `full_name` · อีเมลสำเนาจาก token ตอนสั่ง
2. ค่าจัดส่ง 50 บาท (ตั้งได้ด้วย `SHOP_SHIPPING_FEE_SATANG`)
3. หน้าเว็บ (:4000) กับ backend (:3002) แยก port · `callback_url` ชี้ backend · คุกกี้ `core_hub_access_token` เป็น host-only จึงใช้ร่วมกันได้บน localhost ·
   ถ้าขึ้น server จริงต้องให้หน้าเว็บกับ backend อยู่ origin เดียวกัน (reverse proxy) หรือปรับ domain ของคุกกี้
4. ปุ่มเข้าสู่ระบบพาไปที่ `{CORE_HUB_WEB_URL}/api/sso/csmju-shop` (SSO launcher ของเว็บ Core Hub `main`) เพราะสาย 1.0 ไม่มี `GET /auth/login`
5. ออกจากระบบ = ล้างคุกกี้ของร้านแล้วกลับไปที่ Core Hub (สาย 1.0 ยังไม่มี SSO logout)
6. ตะกร้าเก็บใน `localStorage` (ไม่มี token หรือข้อมูลส่วนบุคคล — SEC-03 ห้ามเฉพาะ token)
7. QR ใส่เฉพาะรหัสรับสินค้า (`PICKUP-xxxxxx`) · ตัวถอด QR ใช้ `BarcodeDetector` ของเบราว์เซอร์ หรือ jsQR (Apache-2.0) ที่ vendor ไว้ใน `src/lib/vendor/`
8. ไอคอนที่ชุดกลางไม่มี (ตะกร้า QR รถส่งของ ฯลฯ) วาดเพิ่มใน `src/components/shared/shop-icons.tsx` สไตล์เดียวกับชุดกลาง (local component ชั่วคราว)
9. ESLint ฝั่ง frontend ใช้ `typescript-eslint` แทน `eslint-config-next` เพราะ `eslint-config-next` ยังไม่อยู่ใน whitelist ของ 1.0.x
10. ชื่อ branch เป็น `feature/shop/core-hub` (ขีดกลาง) แทน `core_hub` ในเอกสาร workflow เพราะกฎ `GH-01` และ ruleset ขององค์กรรับเฉพาะ `[a-z0-9-]`

## สิ่งที่ยังทำไม่ได้ / ต้องแจ้ง PM

- คัดลอกชั้น auth จาก `demo-student-subsystem` (ต้องขอสิทธิ์อ่าน repo)
- `CsmjuAppShell` ของ template: `<main>` ไม่มี `min-w-0` ตารางกว้างจึงดันทั้งหน้า — แก้ฝั่งร้านด้วย `contain:inline-size` ใน `layout.tsx` ไปก่อน ·
  `Modal` ยังไม่มี focus trap · `ui.ts` ยังไม่มี `focus-visible` (ขอแก้ที่ส่วนกลางตาม design-system ข้อ 17.4)
- VALIDATION_ERROR ส่ง `details` เป็น array ของข้อความตาม api-conventions 1.0 (ยังไม่มี `details.field` ที่ design-system ข้อ 16.1.2 ต้องการ)
- ยังไม่ได้ทดสอบบนมือถือจริง / screen reader / Lighthouse และยังไม่ได้ build Docker image (เครื่องที่ทำงานไม่มี Docker daemon)
- ห้อง/เวลาเปิดจุดรับสินค้าจริงยังเป็นข้อความทั่วไป ต้องใส่ข้อมูลจริง
- ข้อมูลในฐานข้อมูลเดิม (`csmju_shop`) ไม่ได้ย้ายมา — `shop_db` เริ่มใหม่ด้วย seed
