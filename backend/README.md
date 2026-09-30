# CSMJU-Shop

ระบบร้านค้าออนไลน์ของสาขาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยแม่โจ้
รองรับสินค้าปกติและสินค้าพรีออเดอร์ การชำระเงินด้วยสลิปโอน และการรับสินค้าหน้าร้านด้วยรหัสรับสินค้า

**Stack:** NestJS 12 (TypeScript, ESM) · Prisma ORM 6 · PostgreSQL 16 · Next.js 16 + React 19 (frontend)

---

## เอกสารในโปรเจกต์

| ไฟล์ | เนื้อหา |
|---|---|
| [`START.md`](START.md) | **ขั้นตอนเปิดใช้งานทีละขั้น — เริ่มที่นี่** |
| `README.md` | ภาพรวมและวิธีติดตั้ง (ไฟล์นี้) |
| [`DATABASE.md`](DATABASE.md) | โครงสร้างฐานข้อมูล ตาราง ความสัมพันธ์ และคำสั่ง Prisma |
| [`API.md`](API.md) | รายการ endpoint ทั้งหมด พร้อมตัวอย่าง request/response |
| [`POSTMAN.md`](POSTMAN.md) | วิธี import และยิงทดสอบด้วย Postman |
| [`TESTCASES.md`](TESTCASES.md) | รายการทดสอบ 52 ข้อ ว่าแต่ละข้อทดสอบอะไรและควรได้ status เท่าไหร่ |
| [`frontend/README.md`](frontend/README.md) | หน้าเว็บ — วิธีเปิดและหน้าที่มี |
| [`PROGRESS.md`](PROGRESS.md) | บันทึกความคืบหน้าของงาน |

---

## ติดตั้งและใช้งาน

### 1. เตรียม PostgreSQL

ต้องมี PostgreSQL ติดตั้งและทำงานอยู่ที่ `localhost:5432` โดยผู้ใช้ `postgres` รหัสผ่านของเครื่องตัวเอง (ใส่ใน `.env` เท่านั้น ห้าม commit)

**ไม่ต้องสร้างฐานข้อมูลเอง** — `npx prisma migrate deploy` ในขั้นที่ 4 จะสร้าง `csmju_shop` ให้อัตโนมัติถ้ายังไม่มี

> เช็กว่า PostgreSQL ทำงานอยู่ไหม (PowerShell): `Get-Service postgresql*`
> ถ้า Status เป็น Stopped ให้สั่ง `Start-Service postgresql-x64-17` (เลขเวอร์ชันตามที่ติดตั้ง)

### 2. ติดตั้ง dependencies

```bash
npm install
```

### 3. ตั้งค่าไฟล์ .env

```env
DATABASE_URL="postgresql://postgres:<PASSWORD>@localhost:5432/csmju_shop?schema=public"
PORT=3000
```

(มีตัวอย่างให้แล้วที่ `.env.example`)

### 4. สร้างฐานข้อมูลและตาราง

```bash
npx prisma migrate deploy   # สร้าง DB (ถ้ายังไม่มี) + สร้างตารางตาม migration
npx prisma generate         # สร้าง Prisma Client
```

หรือถ้าอยากเริ่มใหม่ทั้งหมด:

```bash
npx prisma migrate reset --force
```

> **ถ้าเจอ `Error: P3005 The database schema is not empty`**
> แปลว่าฐานข้อมูลมีตารางอยู่แล้วจาก `prisma db push` ที่เคยรันไว้ แต่ไม่มีประวัติ migration
> แก้ด้วย `npx prisma migrate reset --force` แล้ว `npm run seed` (ล้างข้อมูลเดิมทิ้งทั้งหมด)

### 5. ใส่ข้อมูลตัวอย่าง

```bash
npm run seed
```

จะได้ผู้ใช้ 4 คน สินค้า 4 ชิ้น (9 ตัวเลือก) คำสั่งซื้อ 2 รายการ และประวัติการรับสินค้า 1 รายการ
**id จะเริ่มที่ 1 เสมอ** เพราะ seed รีเซ็ต sequence ให้ทุกครั้ง — ค่าใน Postman จึงใช้ได้ตลอด

### 6. เปิดเซิร์ฟเวอร์

```bash
npm run dev     # โหมดพัฒนา (auto-reload)
npm run build && npm run start:prod   # โหมด production
```

เปิด <http://localhost:3000/api/health> ถ้าได้ `"database": "connected"` แปลว่าพร้อมใช้งาน

---

## คำสั่งที่ใช้บ่อย

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | เปิดเซิร์ฟเวอร์โหมดพัฒนา (watch mode) |
| `npm run build` | คอมไพล์ TypeScript ไปที่ `dist/` |
| `npm run start:prod` | รันจาก `dist/` ที่คอมไพล์แล้ว |
| `npm run seed` | ใส่ข้อมูลตัวอย่าง (ล้างของเดิมก่อน) |
| `npm run db:migrate` | สร้าง migration ใหม่จาก schema ที่แก้ |
| `npm run db:deploy` | ใช้ migration ที่มีอยู่ (สำหรับเครื่องใหม่) |
| `npm run db:studio` | เปิด Prisma Studio ดู/แก้ข้อมูลผ่านเบราว์เซอร์ |
| `npm run db:reset` | ล้างฐานข้อมูลและ migrate ใหม่ทั้งหมด |
| `npm run test:smoke` | ยิงทดสอบทุก endpoint ด้วย curl |
| `npm run test:api` | ยิงทดสอบด้วย Postman collection ผ่าน newman |

---

## โครงสร้างโปรเจกต์

```
csmju-shop/
├── prisma/
│   ├── schema.prisma              # นิยามโครงสร้างฐานข้อมูล
│   ├── seed.cjs                   # ข้อมูลตัวอย่าง (.cjs เพราะโปรเจกต์เป็น ESM)
│   └── migrations/                # ประวัติการเปลี่ยนแปลงโครงสร้าง
│       └── 20260922143333_init/
│           └── migration.sql
├── postman/
│   ├── CSMJU-Shop.postman_collection.json     # 52 requests / 129 assertions
│   └── CSMJU-Shop.postman_environment.json
├── src/
│   ├── main.ts                    # จุดเริ่มต้น ตั้ง ValidationPipe / filter / interceptor
│   ├── app.module.ts              # โมดูลหลัก รวมทุก feature module
│   ├── app.controller.ts          # GET / และ GET /api/health
│   ├── prisma/                    # PrismaService + PrismaModule (@Global)
│   ├── common/
│   │   ├── constants.ts           # ค่าสถานะที่ใช้ร่วมกัน
│   │   ├── dto/                   # PaginationQueryDto
│   │   ├── filters/               # AllExceptionsFilter (แปลง Prisma error)
│   │   ├── interceptors/          # TransformInterceptor (ห่อ response)
│   │   └── utils/                 # serialize, helpers
│   ├── users/                     # แต่ละ feature มี module / controller / service / dto
│   ├── products/
│   ├── variants/
│   ├── orders/
│   ├── order-items/
│   └── pickup-logs/
├── frontend/                      # หน้าเว็บ Next.js (ดู frontend/README.md)
│   ├── app/(shop)/                # หน้าฝั่งนักศึกษา — แคตตาล็อก เช็คเอาต์ บัตรรับสินค้า
│   ├── app/staff/                 # หน้าฝั่งเจ้าหน้าที่ — ภาพรวม สต็อก จุดรับสินค้า
│   ├── lib/api.js                 # ตัวกลางเรียก API
│   └── next.config.mjs            # rewrites /api → localhost:3000
├── tests/smoke-test.sh            # ทดสอบด้วย curl
├── nest-cli.json
├── tsconfig.json
├── .env                           # ค่าเชื่อมต่อฐานข้อมูล (ไม่ขึ้น git)
└── .env.example
```

### หมายเหตุเรื่อง ESM

NestJS 12 เป็น **ESM อย่างเดียว** โปรเจกต์นี้จึงตั้ง `"type": "module"` ใน `package.json` และ
`module`/`moduleResolution` เป็น `nodenext` ใน `tsconfig.json` ผลที่ตามมาคือ

- **import ไฟล์ในโปรเจกต์ต้องลงท้ายด้วย `.js`** แม้ไฟล์จริงเป็น `.ts`
  เช่น `import { UsersService } from './users.service.js';`
  (TypeScript ไม่ได้เขียนผิด — เป็นข้อกำหนดของ ESM ที่อ้างถึงไฟล์ผลลัพธ์หลังคอมไพล์)
- **ไฟล์ที่ยังใช้ `require()` ต้องนามสกุล `.cjs`** จึงเป็นที่มาของ `prisma/seed.cjs`

---

## ฟีเจอร์หลักของ API

- **สินค้าและตัวเลือก** — 1 สินค้ามีหลาย variant (ไซส์/สี) แยกราคาและสต็อกได้
- **สินค้าพรีออเดอร์** — สั่งได้แม้สต็อกเป็น 0 พร้อมกำหนดวันปิดรับและวันส่งโดยประมาณ
- **สั่งซื้อแบบ transaction** — ตรวจสต็อก → ตัดสต็อก → คำนวณยอด → สร้างออร์เดอร์ ทั้งหมดสำเร็จหรือล้มเหลวพร้อมกัน
- **คืนสต็อกอัตโนมัติ** — เมื่อลบออร์เดอร์หรือลบรายการสินค้าออก
- **รับสินค้าหน้าร้าน** — สร้าง `pickup_code` ให้อัตโนมัติ เจ้าหน้าที่ตรวจรหัสแล้วบันทึกการส่งมอบ
- **ตรวจสิทธิ์ตาม role** — เฉพาะ `staff` / `admin` เท่านั้นที่บันทึกการรับสินค้าได้
- **ตรวจ request อัตโนมัติ** — DTO + class-validator ผ่าน `ValidationPipe` ทั่วทั้งแอป
  (`whitelist: true` ตัดฟิลด์แปลกปลอมทิ้ง, ข้อมูลไม่ผ่าน → 422 พร้อมข้อความภาษาไทย)
