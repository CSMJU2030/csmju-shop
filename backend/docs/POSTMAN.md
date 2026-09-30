# POSTMAN — วิธีทดสอบ CSMJU-Shop API

ไฟล์อยู่ในโฟลเดอร์ `postman/` (ใช้ได้กับ API ที่เขียนด้วย NestJS)

| ไฟล์ | คืออะไร |
|---|---|
| `CSMJU-Shop.postman_collection.json` | ชุด request ทั้งหมด **9 โฟลเดอร์ / 52 requests / 129 assertions** |
| `CSMJU-Shop.postman_environment.json` | ค่าตัวแปร (base_url และ id จาก seed) |

---

## เตรียมก่อนยิง

```bash
# 1. ติดตั้ง dependencies (ถ้ายังไม่ได้ทำ)
npm install

# 2. สร้างฐานข้อมูล + ตาราง (สร้าง csmju_shop ให้เองถ้ายังไม่มี)
npx prisma migrate deploy
npx prisma generate

# 3. ใส่ข้อมูลตัวอย่าง
npm run seed

# 4. เปิดเซิร์ฟเวอร์ NestJS แล้วเปิดค้างไว้
npm run dev
```

รอจนขึ้นข้อความ `Nest application successfully started` ก่อนค่อยยิง

ทดสอบว่าพร้อมไหม: เปิด <http://localhost:3000/api/health> ต้องได้ `"database": "connected"`

---

## Import เข้า Postman

1. เปิด Postman → ปุ่ม **Import** (มุมซ้ายบน)
2. ลากไฟล์ทั้งสองเข้าไป หรือกด **Upload Files** แล้วเลือก
   - `postman/CSMJU-Shop.postman_collection.json`
   - `postman/CSMJU-Shop.postman_environment.json`
3. กด **Import**
4. มุมขวาบนของหน้าต่าง Postman เลือก Environment เป็น **CSMJU-Shop Local**

> ถ้าไม่เลือก Environment ตัวแปร `{{base_url}}` จะว่าง และทุก request จะยิงไม่ออก

---

## วิธียิงทดสอบ

### แบบที่ 1 — รันทั้ง collection ทีเดียว (แนะนำ)

1. คลิกขวาที่ collection **CSMJU-Shop API** → **Run collection**
2. ปล่อยค่า default ไว้ (รันตามลำดับโฟลเดอร์)
3. กด **Run CSMJU-Shop API**

ผลที่ควรได้: **52 requests ผ่านทั้งหมด / 129 assertions ผ่านทั้งหมด / 0 failed**

> ดูว่าแต่ละข้อทดสอบอะไรและควรได้ status เท่าไหร่ ที่ [TESTCASES.md](TESTCASES.md)

### แบบที่ 2 — ยิงทีละ request

คลิกโฟลเดอร์ทางซ้าย เลือก request แล้วกด **Send**
แต่ต้องยิง **ตามลำดับโฟลเดอร์** เพราะโฟลเดอร์หลัง ๆ ใช้ค่าที่โฟลเดอร์ก่อนหน้าเก็บไว้

### แบบที่ 3 — รันจาก command line (ไม่ต้องเปิด Postman)

```bash
npm install -g newman
npm run test:api
```

---

## ลำดับของโฟลเดอร์

| โฟลเดอร์ | เนื้อหา | จำนวน |
|---|---|---|
| **00 — System** | ตรวจว่า API และฐานข้อมูลพร้อม | 2 |
| **01 — Users** | CRUD ผู้ใช้ | 5 |
| **02 — Products** | CRUD สินค้า + สร้างสินค้าพรีออเดอร์ | 6 |
| **03 — Product Variants** | CRUD ตัวเลือกสินค้า + ปรับสต็อก | 6 |
| **04 — Orders** | สร้าง/ดู/อัปเดตสถานะคำสั่งซื้อ | 10 |
| **05 — Order Items** | เพิ่ม/แก้/ลบสินค้าในออร์เดอร์ | 5 |
| **06 — Pickup Logs** | ตรวจรหัสรับ + บันทึกการส่งมอบ | 5 |
| **07 — Negative Tests** | ตรวจว่าคืน error code ถูกต้อง (403/404/409/422) | 10 |
| **08 — Cleanup** | ลบข้อมูลที่สร้างระหว่างทดสอบ | 3 |

โฟลเดอร์ 08 จะลบของที่สร้างขึ้นทิ้ง **รัน collection ซ้ำกี่รอบก็ได้โดยไม่ต้อง seed ใหม่**

---

## ตัวแปรที่ใช้

### ค่าคงที่จาก seed (ตั้งไว้ใน Environment แล้ว)

| ตัวแปร | ค่า | คืออะไร |
|---|---|---|
| `base_url` | `http://localhost:3000` | ที่อยู่ API |
| `user_id` | `1` | สมชาย (customer) |
| `staff_id` | `3` | วิชัย (staff) |
| `product_id` | `1` | เสื้อโปโล |
| `variant_id` | `1` | โปโล Size S |
| `order_id` | `1` | ออร์เดอร์ที่จ่ายแล้ว |
| `order_number` | `ORD-202609-0001` | |
| `pickup_code` | `PICKUP-88421` | |

### ค่าที่ถูกเซ็ตอัตโนมัติระหว่างรัน

request ที่สร้างข้อมูลใหม่จะเก็บ id ที่ได้ไว้ในตัวแปรให้ request ถัดไปใช้ต่อ เช่น

```javascript
pm.collectionVariables.set("new_order_id", pm.response.json().data.order_id);
```

| ตัวแปร | ถูกเซ็ตจาก |
|---|---|
| `new_user_id` | POST /api/v1/users |
| `new_product_id`, `new_variant_id` | POST /api/v1/products (สมุดโน้ต) |
| `preorder_product_id`, `preorder_variant_id` | POST /api/v1/products (แจ็คเก็ตพรีออเดอร์) |
| `extra_variant_id` | POST /api/v1/variants |
| `new_order_id`, `new_pickup_code` | POST /api/v1/orders |
| `delivery_order_id` | POST /api/v1/orders (แบบจัดส่ง) |
| `new_item_id` | POST /api/v1/orders/:id/items |
| `new_pickup_id` | POST /api/v1/pickup-logs |

ดูค่าปัจจุบันได้ที่ไอคอนตามุมขวาบน หรือใน tab **Console** (ทุก request ที่เซ็ตตัวแปรจะ log ค่าออกมา)

---

## สิ่งที่ test script ตรวจ

ทุก request มี test script ตรวจอย่างน้อย:

```javascript
pm.test("status = 200", () => pm.response.to.have.status(200));
pm.test("success = true", () => pm.expect(pm.response.json().success).to.eql(true));
```

และบาง request ตรวจลึกกว่านั้น เช่น

| Request | ตรวจอะไรเพิ่ม |
|---|---|
| POST /api/v1/orders (pickup) | `total_amount` = 240 และมี `pickup_code` |
| POST /api/v1/orders (delivery) | `total_amount` = 1290 + 50 = 1340 (รวมค่าส่งถูกต้อง) |
| PATCH payment-slip | `payment_status` เปลี่ยนเป็น `waiting_verify` |
| PATCH payment-status = paid | `order_status` เปลี่ยนเป็น `confirmed` |
| PATCH variants/:id/stock | สต็อกเพิ่มเป็น 35 (25 + 10) |
| POST pickup-logs/verify | `valid` = true |
| GET รายการทั้งหมด | `data` เป็น array และมี `meta.total` |

---

## แก้ปัญหาที่พบบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| `Error: connect ECONNREFUSED 127.0.0.1:3000` | ยังไม่ได้เปิดเซิร์ฟเวอร์ → `npm run dev` |
| ทุก request ขึ้น `Invalid URL` | ยังไม่ได้เลือก Environment มุมขวาบน |
| `/api/health` ขึ้น `database: disconnected` | PostgreSQL ไม่ได้รัน หรือ `DATABASE_URL` ใน `.env` ผิด — เช็กด้วย `Get-Service postgresql*` |
| `psql : The term 'psql' is not recognized` | PowerShell หา `psql` ไม่เจอ (ไม่ได้อยู่ใน PATH) — **ไม่จำเป็นต้องใช้** ข้ามไปใช้ `npx prisma migrate deploy` ได้เลย |
| `Error: P3005 The database schema is not empty` | ฐานข้อมูลมีตารางจาก `db push` แต่ไม่มีประวัติ migration → `npx prisma migrate reset --force` แล้ว `npm run seed` |
| ทุก request ได้ 404 ทั้งที่ server รันอยู่ | ลืม `/api` นำหน้า — ทุก endpoint อยู่ใต้ `/api` ยกเว้นหน้าแรก `/` |
| ส่งฟิลด์เพิ่มไปแต่ไม่บันทึกลงฐานข้อมูล | `ValidationPipe` ตั้ง `whitelist: true` ฟิลด์ที่ไม่ได้ประกาศใน DTO จะถูกตัดทิ้ง |
| GET /api/v1/users/1 ได้ 404 | ยังไม่ได้ seed → `npm run seed` |
| POST /api/v1/users ได้ 409 | อีเมลซ้ำ — seed ใหม่หรือเปลี่ยนอีเมลใน body |
| โฟลเดอร์ 04–06 พังเป็นแถว | ยิงข้ามลำดับ ตัวแปร `new_*` ยังว่าง → รันทั้ง collection แทน |
| `Cannot read properties of undefined` ใน test | request ก่อนหน้าล้มเหลว ทำให้ไม่มีค่าให้อ่าน — ดูว่า request ไหนแดงก่อน |

---

## ทดสอบโดยไม่ใช้ Postman

มีสคริปต์ curl ให้ด้วย ครอบคลุม 55 กรณี:

```bash
npm run test:smoke
```

```
  ผ่าน 55  /  ไม่ผ่าน 0
```
