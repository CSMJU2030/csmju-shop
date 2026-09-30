# API — CSMJU-Shop

Base URL: `http://localhost:3000`
Framework: **NestJS 12** · ทุก endpoint ภายใต้ `/api` (ยกเว้น `/`) · รับ-ส่งเป็น JSON (`Content-Type: application/json`)

---

## รูปแบบ response

**สำเร็จ**

```json
{
  "success": true,
  "message": "ดึงข้อมูลสำเร็จ",
  "data": { }
}
```

**แบบแบ่งหน้า** — เพิ่มฟิลด์ `meta`

```json
{
  "success": true,
  "message": "ดึงรายการสินค้าสำเร็จ",
  "data": [ ],
  "meta": { "page": 1, "limit": 20, "total": 4, "total_pages": 1 }
}
```

**ผิดพลาด**

```json
{
  "success": false,
  "message": "ไม่พบสินค้า"
}
```

## HTTP status ที่ใช้

| Code | ความหมาย |
|---|---|
| 200 | สำเร็จ |
| 201 | สร้างข้อมูลใหม่สำเร็จ |
| 400 | พารามิเตอร์ไม่ถูกต้อง (เช่น id ไม่ใช่ตัวเลข) |
| 403 | ไม่มีสิทธิ์ (เช่น customer บันทึกการรับสินค้า) |
| 404 | ไม่พบข้อมูล / ไม่พบ endpoint |
| 409 | ขัดแย้ง (ข้อมูลซ้ำ, สต็อกไม่พอ, ลบไม่ได้เพราะมีข้อมูลอ้างอิง) |
| 413 | ไฟล์ที่อัปโหลดใหญ่เกิน 5MB |
| 422 | ข้อมูลใน body ไม่ครบหรือไม่ถูกต้อง |
| 500 | ข้อผิดพลาดของเซิร์ฟเวอร์ |

---

## สารบัญ

- [System](#system)
- [Users](#users)
- [Products](#products)
- [Product Variants](#product-variants)
- [Uploads — รูปสินค้า](#uploads--รูปสินค้า)
- [Orders](#orders)
- [Order Items](#order-items)
- [Pickup Logs](#pickup-logs)

---

## System

| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/` | ข้อมูล API และรายชื่อ endpoint |
| GET | `/api/health` | ตรวจสอบการเชื่อมต่อฐานข้อมูล |

```bash
curl http://localhost:3000/api/health
```

```json
{
  "success": true,
  "message": "CSMJU-Shop API พร้อมใช้งาน",
  "data": { "database": "connected", "timestamp": "2026-09-22T15:13:29.155Z" }
}
```

---

## Users

| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/api/users` | รายการผู้ใช้ |
| GET | `/api/users/:id` | ผู้ใช้รายคน (พร้อมออร์เดอร์ล่าสุด 10 รายการ) |
| POST | `/api/users` | สร้างผู้ใช้ |
| PUT | `/api/users/:id` | แก้ไขผู้ใช้ |
| DELETE | `/api/users/:id` | ลบผู้ใช้ |

**Query parameters ของ GET `/api/users`**

| ชื่อ | ตัวอย่าง | ความหมาย |
|---|---|---|
| `page` | `1` | หน้าที่ต้องการ |
| `limit` | `20` | จำนวนต่อหน้า (สูงสุด 100) |
| `role` | `staff` | กรองตามบทบาท |
| `search` | `สมชาย` | ค้นจากชื่อ / อีเมล / รหัสนักศึกษา |

**POST `/api/users`**

```json
{
  "student_id": "6604101888",
  "fullname": "ทดสอบ ระบบ",
  "email": "test@csmju.ac.th",
  "phone": "0870000000",
  "role": "customer"
}
```

- บังคับ: `fullname`, `email`, `phone`
- `email` และ `student_id` ห้ามซ้ำ → ซ้ำได้ **409**
- `role` ต้องเป็น `customer` / `staff` / `admin` → ผิดได้ **422**

**DELETE `/api/users/:id`** — ลบไม่ได้ถ้าผู้ใช้มีคำสั่งซื้ออยู่ → **409**

---

## Products

| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/api/products` | รายการสินค้า (แนบ variants มาด้วย) |
| GET | `/api/products/categories/all` | รายชื่อหมวดหมู่ + จำนวนสินค้า |
| GET | `/api/products/:id` | สินค้ารายชิ้น |
| POST | `/api/products` | สร้างสินค้า (สร้าง variants พร้อมกันได้) |
| PUT | `/api/products/:id` | แก้ไขสินค้า |
| DELETE | `/api/products/:id` | ลบสินค้า (variants หายตาม) |

**Query parameters ของ GET `/api/products`**

| ชื่อ | ตัวอย่าง | ความหมาย |
|---|---|---|
| `page` / `limit` | `1` / `20` | แบ่งหน้า |
| `category` | `ของที่ระลึก` | กรองตามหมวดหมู่ |
| `is_preorder` | `true` | เฉพาะสินค้าพรีออเดอร์ |
| `search` | `โปโล` | ค้นจากชื่อ / รายละเอียด |

**POST `/api/products`**

```json
{
  "name": "สมุดโน้ต CSMJU Notebook",
  "description": "สมุดปกแข็ง A5 100 แผ่น",
  "category": "เครื่องเขียน",
  "image_url": "/uploads/products/1790175406775-f410d4bf.jpg",
  "is_preorder": false,
  "variants": [
    { "variant_name": "ปกเขียว", "price": 120, "stock_quantity": 40 },
    { "variant_name": "ปกดำ", "price": 120, "stock_quantity": 35 }
  ]
}
```

- บังคับ: `name`, `category`
- `image_url` ใส่หรือไม่ใส่ก็ได้ — ได้มาจาก [POST `/api/uploads/image`](#uploads--รูปสินค้า) · ส่งค่าว่างตอน PUT = เอารูปออก
- ถ้า `is_preorder: true` ต้องมี `preorder_end_date` ด้วย → ไม่มีได้ **422**
- แต่ละ variant ต้องมี `variant_name` และ `price`

**DELETE `/api/products/:id`** — ลบไม่ได้ถ้ามีสินค้าชิ้นนี้อยู่ในคำสั่งซื้อแล้ว → **409**

---

## Product Variants

| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/api/variants` | รายการตัวเลือกสินค้า |
| GET | `/api/variants/:id` | ตัวเลือกรายการเดียว |
| POST | `/api/variants` | เพิ่มตัวเลือกให้สินค้าที่มีอยู่ |
| PUT | `/api/variants/:id` | แก้ชื่อ / ราคา / สต็อก |
| PATCH | `/api/variants/:id/stock` | ปรับสต็อกโดยเฉพาะ |
| DELETE | `/api/variants/:id` | ลบตัวเลือก |

**Query parameters ของ GET `/api/variants`**: `product_id`, `in_stock=true` (เฉพาะที่ยังมีของ)

**POST `/api/variants`**

```json
{ "product_id": 5, "variant_name": "ปกน้ำเงิน", "price": 125, "stock_quantity": 25 }
```

**PATCH `/api/variants/:id/stock`** — เลือกใช้อย่างใดอย่างหนึ่ง

```json
{ "adjust": 10 }     // เพิ่ม 10 (ใส่ -5 เพื่อลด)
{ "set": 100 }       // กำหนดเป็น 100 ตรง ๆ
```

ถ้าผลลัพธ์ติดลบ → **422**

---

## Uploads — รูปสินค้า

| Method | Path | คำอธิบาย |
|---|---|---|
| POST | `/api/uploads/image` | อัปโหลดรูป (multipart/form-data ฟิลด์ชื่อ `file`) |
| DELETE | `/api/uploads/image?url=...` | ลบไฟล์รูปที่ไม่ได้ใช้แล้ว |
| GET | `/uploads/products/<ชื่อไฟล์>` | เปิดดูรูป (ไม่มี prefix `/api` เพราะเป็นไฟล์) |

```bash
curl -X POST http://localhost:3000/api/uploads/image -F "file=@polo.jpg"
```

```json
{
  "success": true,
  "message": "อัปโหลดรูปสำเร็จ",
  "data": {
    "url": "/uploads/products/1790175406775-f410d4bf.jpg",
    "filename": "1790175406775-f410d4bf.jpg",
    "size": 12399,
    "original_name": "polo.jpg"
  }
}
```

เอา `url` ที่ได้ไปใส่เป็น `image_url` ตอน POST/PUT สินค้า

**กติกา**

| เรื่อง | ค่า |
|---|---|
| ชนิดไฟล์ | JPG · PNG · WEBP · GIF (อย่างอื่น → **422**) |
| ขนาดสูงสุด | 5MB (เกิน → **413** พร้อมข้อความภาษาไทย) |
| ชื่อไฟล์ | ระบบตั้งใหม่แบบสุ่มเสมอ ไม่ใช้ชื่อเดิมจากเครื่องผู้ใช้ |
| ที่เก็บ | โฟลเดอร์ `uploads/products/` ของ backend — ฐานข้อมูลเก็บแค่ที่อยู่ |

> ไฟล์รูปไม่ได้อยู่ในฐานข้อมูล ถ้าย้ายเครื่องต้องก๊อบโฟลเดอร์ `uploads/` ไปด้วย

---

## Orders

| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/api/orders` | รายการคำสั่งซื้อ |
| GET | `/api/orders/stats/summary` | สรุปยอดสำหรับ dashboard |
| GET | `/api/orders/:id` | คำสั่งซื้อรายการเดียว |
| GET | `/api/orders/number/:orderNumber` | ค้นด้วยเลขที่ออร์เดอร์ |
| POST | `/api/orders` | สร้างคำสั่งซื้อ |
| PATCH | `/api/orders/:id/payment-slip` | แนบสลิปโอนเงิน |
| PATCH | `/api/orders/:id/payment-status` | อัปเดตสถานะการชำระเงิน |
| PATCH | `/api/orders/:id/order-status` | อัปเดตสถานะคำสั่งซื้อ |
| PATCH | `/api/orders/:id/shipping` | บันทึกบริษัทขนส่ง + เลขพัสดุ (เฉพาะแบบจัดส่ง) |
| DELETE | `/api/orders/:id` | ลบคำสั่งซื้อ (คืนสต็อกให้เฉพาะออร์เดอร์ที่ยังไม่ส่งมอบ) |

**Query parameters ของ GET `/api/orders`**: `page`, `limit`, `user_id`, `order_status`, `payment_status`, `delivery_method`, `search` (เลขที่ออร์เดอร์ / รหัสรับสินค้า / เลขพัสดุ)

### POST `/api/orders` — สร้างคำสั่งซื้อ

```json
{
  "user_id": 1,
  "delivery_method": "pickup",
  "items": [
    { "variant_id": 3, "quantity": 2 },
    { "variant_id": 5, "quantity": 1 }
  ]
}
```

แบบจัดส่ง:

```json
{
  "user_id": 1,
  "delivery_method": "delivery",
  "shipping_fee": 50,
  "shipping_address": "123 หมู่ 4 ต.หนองหาร อ.สันทราย จ.เชียงใหม่ 50290",
  "items": [{ "variant_id": 3, "quantity": 1 }]
}
```

**สิ่งที่ระบบทำให้อัตโนมัติ (ทั้งหมดอยู่ใน transaction เดียว)**

1. ตรวจว่ามีผู้ใช้และ variant จริง
2. ตรวจสต็อก — ถ้าไม่พอจะได้ **409** (สินค้าพรีออเดอร์ข้ามขั้นนี้)
3. ตัดสต็อกตามจำนวนที่สั่ง
4. คำนวณ `total_amount` = ผลรวมราคา + `shipping_fee`
5. สร้าง `order_number` รูปแบบ `ORD-YYYYMM-XXXX` — เดินเลขต่อจาก **เลขที่สูงสุดของเดือนนั้น** (ไม่ใช่จากจำนวนออร์เดอร์ที่มีอยู่ เพราะจะชนกันหลังมีการลบออร์เดอร์) และถ้าชนจริง ๆ ระบบจะลองใหม่ให้อัตโนมัติสูงสุด 3 ครั้ง
6. สร้าง `pickup_code` ให้เมื่อเป็น `delivery_method: "pickup"`
7. ตั้ง `payment_status` เป็น `waiting_verify` ถ้าแนบสลิปมาแล้ว มิฉะนั้น `pending`

ถ้าขั้นใดขั้นหนึ่งล้มเหลว จะย้อนกลับทั้งหมด ไม่มีสต็อกหายโดยที่ออร์เดอร์ไม่ถูกสร้าง

**ข้อผิดพลาดที่พบบ่อย**

| กรณี | Status |
|---|---|
| ไม่ส่ง `items` หรือ `items` ว่าง | 422 |
| `delivery` แต่ไม่ส่ง `shipping_address` | 422 |
| `delivery_method` ไม่ใช่ `pickup` / `delivery` | 422 |
| สต็อกไม่พอ | 409 |
| `user_id` หรือ `variant_id` ไม่มีจริง | 404 |

### PATCH สถานะต่าง ๆ

```json
// /api/orders/:id/payment-slip
{ "payment_slip": "https://example.com/slips/slip.jpg" }

// /api/orders/:id/payment-status
{ "payment_status": "paid" }

// /api/orders/:id/order-status
{ "order_status": "ready_for_pickup" }
```

- แนบสลิป → `payment_status` เปลี่ยนเป็น `waiting_verify` อัตโนมัติ
- ตั้ง `payment_status: "paid"` → `order_status` เปลี่ยนเป็น `confirmed` อัตโนมัติ

### DELETE `/api/orders/:id` — ลบคำสั่งซื้อ

การคืนสต็อกขึ้นอยู่กับว่าสินค้าออกจากร้านไปแล้วหรือยัง

| `order_status` ก่อนลบ | คืนสต็อก? | เหตุผล |
|---|---|---|
| `pending` / `confirmed` / `ready_for_pickup` / `cancelled` | **คืน** | ของยังอยู่ในร้าน การลบคือการยกเลิกออร์เดอร์ |
| `completed` | **ไม่คืน** | นักศึกษารับของไปแล้วจริง ถ้าคืนสต็อกจำนวนคงเหลือจะเพิ่มเองทั้งที่สินค้าไม่ได้กลับมา |

```json
// ลบออร์เดอร์ที่ยังไม่ส่งมอบ
{ "success": true, "message": "ลบคำสั่งซื้อและคืนสต็อกสำเร็จ",
  "data": { "order_id": 3, "stock_restored": true } }

// ลบออร์เดอร์ที่รับสินค้าไปแล้ว
{ "success": true, "message": "ลบคำสั่งซื้อที่ส่งมอบแล้วสำเร็จ (ไม่คืนสต็อกเพราะสินค้าออกจากร้านไปแล้ว)",
  "data": { "order_id": 5, "stock_restored": false } }
```

`order_items` และ `pickup_logs` ของออร์เดอร์นั้นถูกลบตามด้วย (`onDelete: Cascade`) — ย้อนกลับไม่ได้
ไม่พบออร์เดอร์ → **404**

### PATCH `/api/orders/:id/shipping` — ข้อมูลการจัดส่ง

ใช้กับออร์เดอร์ที่ `delivery_method: "delivery"` เท่านั้น (ถ้าเป็น `pickup` จะได้ **422**)

```json
{ "shipping_carrier": "thailand_post", "tracking_number": "EB123456789TH" }
```

| ฟิลด์ | ความหมาย |
|---|---|
| `shipping_carrier` | รหัสขนส่ง — `thailand_post` · `flash` · `kerry` · `jt` · `ninjavan` · `best` · `scg` · `dhl` (หรือพิมพ์ชื่ออื่นก็ได้ แต่จะไม่มีลิงก์เช็คพัสดุให้) |
| `tracking_number` | เลขติดตามพัสดุ |
| `mark_shipped` | ไม่ใส่ = `true` · ใส่เลขครั้งแรกแล้วเปลี่ยน `order_status` เป็น `shipped` ให้เลย · ส่ง `false` ถ้ายังไม่อยากเปลี่ยนสถานะ |

**สิ่งที่ระบบทำให้**

1. ใส่เลขพัสดุครั้งแรก → ตั้ง `shipped_at` เป็นเวลาปัจจุบัน
2. เลื่อน `order_status` เป็น `shipped` (ยกเว้นออร์เดอร์ที่ `completed` / `cancelled` / `shipped` อยู่แล้ว)
3. ส่ง `shipping_carrier` และ `tracking_number` เป็นค่าว่างทั้งคู่ = ล้างข้อมูลจัดส่งทิ้ง (กรณีกรอกผิด)

**ข้อผิดพลาด**

| กรณี | Status |
|---|---|
| ออร์เดอร์เป็นแบบ `pickup` | 422 |
| ใส่เลขพัสดุแต่ไม่ระบุขนส่ง | 422 |
| ไม่พบออร์เดอร์ | 404 |

> `GET /api/orders?search=EB123456789TH` ค้นจากเลขพัสดุได้ด้วย (นอกจากเลขที่ออร์เดอร์และรหัสรับสินค้า)

### GET `/api/orders/stats/summary`

```json
{
  "success": true,
  "data": {
    "total_orders": 2,
    "total_revenue_paid": 1040,
    "by_order_status": [{ "status": "ready_for_pickup", "count": 1 }],
    "by_payment_status": [{ "status": "paid", "count": 1 }]
  }
}
```

---

## Order Items

| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/api/orders/:orderId/items` | รายการสินค้าในออร์เดอร์ |
| POST | `/api/orders/:orderId/items` | เพิ่มสินค้าเข้าออร์เดอร์เดิม |
| GET | `/api/order-items/:id` | รายการเดียว |
| PUT | `/api/order-items/:id` | แก้จำนวน |
| DELETE | `/api/order-items/:id` | ลบรายการ |

```json
// POST /api/orders/3/items
{ "variant_id": 5, "quantity": 2 }

// PUT /api/order-items/7
{ "quantity": 3 }
```

ทุกครั้งที่เพิ่ม/แก้/ลบ ระบบจะปรับสต็อกตามส่วนต่างและคำนวณ `total_amount` ของออร์เดอร์ใหม่ให้อัตโนมัติ

---

## Pickup Logs

| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/api/pickup-logs` | ประวัติการรับสินค้า |
| GET | `/api/pickup-logs/:id` | บันทึกรายการเดียว |
| POST | `/api/pickup-logs/verify` | ตรวจสอบรหัสรับสินค้า (ยังไม่บันทึก) |
| POST | `/api/pickup-logs` | บันทึกการส่งมอบสินค้า |
| DELETE | `/api/pickup-logs/:id` | ลบบันทึก |

**Query parameters ของ GET**: `page`, `limit`, `order_id`, `staff_id`

### POST `/api/pickup-logs/verify` — ขั้นตอนตรวจก่อนส่งมอบ

```json
{ "pickup_code": "PICKUP-88421" }
```

```json
{
  "success": true,
  "data": {
    "valid": true,
    "already_picked_up": false,
    "order": { }
  }
}
```

- `valid` — ชำระเงินแล้วและยังไม่ถูกยกเลิก
- `already_picked_up` — เคยมีบันทึกการรับไปแล้วหรือยัง
- รหัสไม่มีจริง → **404**

### POST `/api/pickup-logs` — บันทึกการส่งมอบ

```json
{
  "pickup_code": "PICKUP-88421",
  "staff_id": 3,
  "notes": "ตรวจรหัสถูกต้อง ส่งมอบสินค้าแล้ว"
}
```

ส่ง `order_id` แทน `pickup_code` ก็ได้

**เงื่อนไข**

| กรณี | Status |
|---|---|
| `staff_id` มี `role` เป็น `customer` | 403 |
| ออร์เดอร์ยังไม่ชำระเงิน (`payment_status ≠ paid`) | 409 |
| ออร์เดอร์ถูกยกเลิกแล้ว | 409 |
| ไม่พบออร์เดอร์ / รหัสผิด | 404 |

เมื่อบันทึกสำเร็จ `order_status` จะเปลี่ยนเป็น `completed` อัตโนมัติ

---

## ตัวอย่างการใช้งานจริง (flow เต็ม)

```bash
# 1. ลูกค้าสั่งซื้อ
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"delivery_method":"pickup","items":[{"variant_id":3,"quantity":1}]}'
# → ได้ order_id และ pickup_code กลับมา

# 2. ลูกค้าแนบสลิป
curl -X PATCH http://localhost:3000/api/orders/3/payment-slip \
  -H "Content-Type: application/json" \
  -d '{"payment_slip":"https://example.com/slip.jpg"}'

# 3. เจ้าหน้าที่ยืนยันว่าเงินเข้าแล้ว
curl -X PATCH http://localhost:3000/api/orders/3/payment-status \
  -H "Content-Type: application/json" \
  -d '{"payment_status":"paid"}'

# 4. เจ้าหน้าที่แจ้งว่าของพร้อมรับ
curl -X PATCH http://localhost:3000/api/orders/3/order-status \
  -H "Content-Type: application/json" \
  -d '{"order_status":"ready_for_pickup"}'

# 5. ลูกค้ามาถึงร้าน เจ้าหน้าที่ตรวจรหัส
curl -X POST http://localhost:3000/api/pickup-logs/verify \
  -H "Content-Type: application/json" \
  -d '{"pickup_code":"PICKUP-123456"}'

# 6. ส่งมอบและบันทึก → order_status กลายเป็น completed
curl -X POST http://localhost:3000/api/pickup-logs \
  -H "Content-Type: application/json" \
  -d '{"pickup_code":"PICKUP-123456","staff_id":3,"notes":"ส่งมอบเรียบร้อย"}'
```

---

## การตรวจสอบข้อมูล (Validation)

NestJS ตรวจ request body และ query อัตโนมัติผ่าน `ValidationPipe` ที่ตั้งไว้ใน `src/main.ts`
โดยอิงจาก DTO ของแต่ละ endpoint (อยู่ในโฟลเดอร์ `dto/` ของแต่ละ module)

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,          // ตัดฟิลด์ที่ไม่ได้ประกาศใน DTO ทิ้ง
    transform: true,          // แปลงชนิดข้อมูลตาม @Type()
    errorHttpStatusCode: 422, // ข้อมูลไม่ผ่าน → 422
  }),
);
```

ผลที่ตามมา

- ส่งฟิลด์แปลก ๆ มาเพิ่ม → ถูกตัดทิ้งเงียบ ๆ ไม่เข้าฐานข้อมูล
- ส่งข้อมูลผิดชนิดหรือขาดฟิลด์บังคับ → **422** พร้อมข้อความภาษาไทยบอกว่าผิดตรงไหน
- `:id` ที่ไม่ใช่ตัวเลข → **400** จาก `ParseIntPipe`

ตัวอย่าง response เมื่อข้อมูลไม่ผ่าน

```json
{
  "success": false,
  "message": "quantity ต้องมากกว่า 0",
  "details": ["quantity ต้องมากกว่า 0"]
}
```

`details` จะมีเฉพาะตอน validation ไม่ผ่าน (รวมทุกข้อความที่ผิด) ส่วน `message` คือข้อความแรก

## การจัดการ error

`AllExceptionsFilter` (`src/common/filters/`) แปลง exception ทุกชนิดให้อยู่ในรูปแบบเดียวกัน
รวมถึงแปลง error code ของ Prisma

| Prisma code | ความหมาย | HTTP status |
|---|---|---|
| `P2002` | ค่าซ้ำใน unique constraint | 409 |
| `P2003` | foreign key ไม่ถูกต้อง | 400 |
| `P2025` | ไม่พบเรคอร์ดที่จะแก้/ลบ | 404 |
