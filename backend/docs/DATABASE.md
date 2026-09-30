# DATABASE — CSMJU-Shop

ฐานข้อมูล: **PostgreSQL 16** · ชื่อ **`csmju_shop`** · ORM: **Prisma 6**
ไฟล์นิยาม: `prisma/schema.prisma` · Migration: `20260922143333_init` (โครงหลัก) · `20260923150000_add_product_image_url` (คอลัมน์รูปสินค้า) · `20260924090000_add_order_shipping_tracking` (ข้อมูลจัดส่ง)
เข้าถึงจากโค้ดผ่าน `PrismaService` (`src/prisma/prisma.service.ts`) ซึ่งลงทะเบียนเป็น `@Global()` module

---

## 1. ภาพรวมความสัมพันธ์

```
users ─┬─< orders ─┬─< order_items >─── product_variants >─── products
       │           │                         (variant_id)        (product_id)
       │           └─< pickup_logs
       └─< pickup_logs (staff_id)
```

| ความสัมพันธ์ | แบบ | อธิบาย |
|---|---|---|
| `users` → `orders` | 1 : N | ผู้ใช้ 1 คนมีได้หลายคำสั่งซื้อ |
| `products` → `product_variants` | 1 : N | สินค้า 1 ชิ้นมีหลายตัวเลือก (ไซส์/สี) |
| `product_variants` → `order_items` | 1 : N | ตัวเลือกหนึ่งถูกสั่งได้ในหลายออร์เดอร์ |
| `orders` → `order_items` | 1 : N | ออร์เดอร์หนึ่งมีได้หลายรายการสินค้า |
| `orders` → `pickup_logs` | 1 : N | บันทึกการรับสินค้าของออร์เดอร์ |
| `users` → `pickup_logs` | 1 : N | เจ้าหน้าที่ (`staff_id`) เป็นผู้บันทึก |

---

## 2. โครงสร้างตาราง

### 2.1 `users` — ผู้ใช้งาน

| คอลัมน์ | ชนิด | ข้อกำหนด | คำอธิบาย |
|---|---|---|---|
| `user_id` | SERIAL | **PK** | รหัสผู้ใช้ |
| `student_id` | VARCHAR(20) | UNIQUE, NULL ได้ | รหัสนักศึกษา (บุคลากรไม่มีได้) |
| `fullname` | VARCHAR(100) | NOT NULL | ชื่อ-นามสกุล |
| `email` | VARCHAR(100) | UNIQUE, NOT NULL | อีเมล |
| `phone` | VARCHAR(15) | NOT NULL | เบอร์โทร |
| `role` | VARCHAR(20) | ค่าเริ่มต้น `customer` | `customer` / `staff` / `admin` |
| `created_at` | TIMESTAMPTZ | ค่าเริ่มต้น `now()` | วันที่สมัคร |

### 2.2 `products` — สินค้า

| คอลัมน์ | ชนิด | ข้อกำหนด | คำอธิบาย |
|---|---|---|---|
| `product_id` | SERIAL | **PK** | รหัสสินค้า |
| `name` | VARCHAR(150) | NOT NULL | ชื่อสินค้า |
| `description` | TEXT | NULL ได้ | รายละเอียด |
| `category` | VARCHAR(50) | NOT NULL, INDEX | หมวดหมู่ |
| `image_url` | VARCHAR(255) | NULL ได้ | ที่อยู่รูปสินค้า เช่น `/uploads/products/xxx.jpg` — เก็บแค่ที่อยู่ ไฟล์จริงอยู่ในโฟลเดอร์ `uploads/` ของ backend |
| `is_preorder` | BOOLEAN | ค่าเริ่มต้น `false`, INDEX | เป็นสินค้าพรีออเดอร์หรือไม่ |
| `preorder_end_date` | TIMESTAMPTZ | NULL ได้ | วันปิดรับพรีออเดอร์ |
| `estimated_delivery` | DATE | NULL ได้ | วันที่คาดว่าจะได้รับ |
| `created_at` | TIMESTAMPTZ | ค่าเริ่มต้น `now()` | วันที่เพิ่มสินค้า |

### 2.3 `product_variants` — ตัวเลือกสินค้า

| คอลัมน์ | ชนิด | ข้อกำหนด | คำอธิบาย |
|---|---|---|---|
| `variant_id` | SERIAL | **PK** | รหัสตัวเลือก |
| `product_id` | INTEGER | **FK →** `products`, NOT NULL | สินค้าที่สังกัด |
| `variant_name` | VARCHAR(50) | NOT NULL | เช่น "Size L", "สีเขียว" |
| `price` | DECIMAL(10,2) | NOT NULL | ราคาต่อหน่วย |
| `stock_quantity` | INTEGER | ค่าเริ่มต้น `0` | จำนวนคงเหลือ |

- `UNIQUE (product_id, variant_name)` — สินค้าเดียวกันห้ามมีตัวเลือกชื่อซ้ำ
- `ON DELETE CASCADE` — ลบสินค้าแล้วตัวเลือกหายตาม

### 2.4 `orders` — คำสั่งซื้อ

| คอลัมน์ | ชนิด | ข้อกำหนด | คำอธิบาย |
|---|---|---|---|
| `order_id` | SERIAL | **PK** | รหัสคำสั่งซื้อ |
| `order_number` | VARCHAR(20) | UNIQUE, NOT NULL | เลขที่ เช่น `ORD-202609-0001` |
| `user_id` | INTEGER | **FK →** `users`, NOT NULL | ผู้สั่งซื้อ |
| `total_amount` | DECIMAL(10,2) | NOT NULL | ยอดรวม (สินค้า + ค่าส่ง) |
| `delivery_method` | VARCHAR(20) | NOT NULL | `pickup` / `delivery` |
| `shipping_fee` | DECIMAL(10,2) | ค่าเริ่มต้น `0.00` | ค่าจัดส่ง |
| `shipping_address` | TEXT | NULL ได้ | จำเป็นเมื่อเป็น `delivery` |
| `payment_slip` | VARCHAR(255) | NULL ได้ | URL/ชื่อไฟล์สลิป |
| `payment_status` | VARCHAR(20) | ค่าเริ่มต้น `pending`, INDEX | สถานะชำระเงิน |
| `order_status` | VARCHAR(20) | ค่าเริ่มต้น `pending`, INDEX | สถานะคำสั่งซื้อ |
| `pickup_code` | VARCHAR(50) | UNIQUE, NULL ได้ | รหัสรับสินค้าหน้าร้าน (เฉพาะ `pickup`) |
| `shipping_carrier` | VARCHAR(50) | NULL ได้ | รหัสบริษัทขนส่ง เช่น `thailand_post`, `flash` (เฉพาะ `delivery`) |
| `tracking_number` | VARCHAR(50) | NULL ได้, INDEX | เลขติดตามพัสดุที่เจ้าหน้าที่กรอก |
| `shipped_at` | TIMESTAMPTZ | NULL ได้ | เวลาที่ส่งของเข้าขนส่ง (ตั้งให้อัตโนมัติตอนใส่เลขพัสดุครั้งแรก) |
| `created_at` | TIMESTAMPTZ | ค่าเริ่มต้น `now()` | วันที่สั่ง |

**ค่าที่ใช้ได้ของสถานะ**

| ฟิลด์ | ค่า |
|---|---|
| `payment_status` | `pending` · `waiting_verify` · `paid` · `rejected` · `refunded` |
| `order_status` | `pending` · `confirmed` · `preparing` · `ready_for_pickup` · `shipped` · `completed` · `cancelled` |
| `delivery_method` | `pickup` · `delivery` |

### 2.5 `order_items` — รายการสินค้าในคำสั่งซื้อ

| คอลัมน์ | ชนิด | ข้อกำหนด | คำอธิบาย |
|---|---|---|---|
| `item_id` | SERIAL | **PK** | รหัสรายการ |
| `order_id` | INTEGER | **FK →** `orders`, NOT NULL | คำสั่งซื้อ |
| `variant_id` | INTEGER | **FK →** `product_variants`, NOT NULL | ตัวเลือกสินค้า |
| `quantity` | INTEGER | NOT NULL | จำนวน |
| `unit_price` | DECIMAL(10,2) | NOT NULL | ราคา ณ เวลาที่สั่ง (ไม่เปลี่ยนตามราคาปัจจุบัน) |
| `is_preorder_item` | BOOLEAN | ค่าเริ่มต้น `false` | เป็นสินค้าพรีออเดอร์หรือไม่ |

- `ON DELETE CASCADE` จาก `orders` — ลบออร์เดอร์แล้วรายการหายตาม

### 2.6 `pickup_logs` — บันทึกการรับสินค้า

| คอลัมน์ | ชนิด | ข้อกำหนด | คำอธิบาย |
|---|---|---|---|
| `pickup_id` | SERIAL | **PK** | รหัสบันทึก |
| `order_id` | INTEGER | **FK →** `orders`, NOT NULL | คำสั่งซื้อที่มารับ |
| `staff_id` | INTEGER | **FK →** `users`, NOT NULL | เจ้าหน้าที่ผู้ส่งมอบ |
| `pickup_time` | TIMESTAMPTZ | ค่าเริ่มต้น `now()` | เวลาที่รับ |
| `notes` | TEXT | NULL ได้ | หมายเหตุ |

---

## 3. เหตุผลการออกแบบบางจุด

**ทำไมแยก `product_variants` ออกจาก `products`**
เสื้อ 1 แบบมีหลายไซส์ ราคาและสต็อกไม่เท่ากัน ถ้าเก็บรวมในตารางเดียวจะต้องสร้างสินค้าซ้ำหลายแถวและแก้ชื่อ/รายละเอียดทีละแถว การแยกทำให้แก้ข้อมูลสินค้าที่เดียวแล้วมีผลกับทุกไซส์

**ทำไม `order_items` เก็บ `unit_price` ซ้ำกับ `product_variants.price`**
ราคาสินค้าเปลี่ยนได้ตลอด แต่ใบเสร็จย้อนหลังต้องคงราคาเดิม จึงต้องถ่ายสำเนาราคา ณ ตอนสั่งมาเก็บไว้ (snapshot)

**ทำไม `order_items` อ้าง `variant_id` ไม่ใช่ `product_id`**
เพราะสิ่งที่ลูกค้าซื้อจริงคือ "เสื้อโปโล Size L" ไม่ใช่ "เสื้อโปโล" เฉย ๆ — และเข้าถึง `products` ต่อได้ผ่าน variant อยู่แล้ว

**ทำไมเก็บ `shipping_carrier` เป็นรหัสสั้น ไม่ใช่ลิงก์เช็คพัสดุทั้งอัน**
ถ้าวันหนึ่งขนส่งเปลี่ยน URL หน้าเช็คพัสดุ การเก็บลิงก์ไว้ในฐานข้อมูลแปลว่าต้องไล่แก้ข้อมูลเก่าทุกแถว
เก็บแค่รหัส (`flash`) แล้วให้หน้าเว็บประกอบลิงก์เอง (`frontend/lib/carriers.js`) จึงแก้ที่เดียวจบ

**ทำไมใช้ `DECIMAL(10,2)` ไม่ใช่ `FLOAT`**
`FLOAT` มีปัญหาปัดเศษ (0.1 + 0.2 ≠ 0.3) ซึ่งยอมรับไม่ได้กับเงิน `DECIMAL` เก็บค่าตรงตัว

**ทำไมใช้ `TIMESTAMPTZ`**
เก็บ timezone ติดไปด้วย ทำให้เวลาที่แสดงถูกต้องไม่ว่าเซิร์ฟเวอร์จะตั้งโซนอะไร

**`ON DELETE` ที่เลือกใช้**

| จาก → ไป | พฤติกรรม | เหตุผล |
|---|---|---|
| `products` → `product_variants` | CASCADE | ตัวเลือกไม่มีความหมายถ้าไม่มีสินค้า |
| `orders` → `order_items` | CASCADE | รายการไม่มีความหมายถ้าไม่มีออร์เดอร์ |
| `orders` → `pickup_logs` | CASCADE | เช่นเดียวกัน |
| `users` → `orders` | RESTRICT | กันลบผู้ใช้ทิ้งแล้วประวัติการซื้อหาย |
| `product_variants` → `order_items` | RESTRICT | กันลบสินค้าที่เคยขายไปแล้ว |

---

## 4. คำสั่ง Prisma ที่ใช้บ่อย

```bash
# สร้าง migration ใหม่หลังแก้ schema.prisma
npx prisma migrate dev --name ชื่อ_การเปลี่ยนแปลง

# ใช้ migration ที่มีอยู่แล้ว (เครื่องใหม่ / production)
# สร้างฐานข้อมูลให้เองถ้ายังไม่มี — ไม่ต้องใช้ psql สร้างล่วงหน้า
npx prisma migrate deploy

# สร้าง Prisma Client ใหม่หลังแก้ schema
npx prisma generate

# ล้างฐานข้อมูลและ migrate ใหม่ทั้งหมด
npx prisma migrate reset --force

# เปิดหน้าดู/แก้ข้อมูลผ่านเบราว์เซอร์
npx prisma studio

# ตรวจว่า schema ตรงกับฐานข้อมูลจริงไหม
npx prisma migrate status
```

---

## 5. ข้อมูลตัวอย่างจาก `npm run seed`

seed (`prisma/seed.cjs`) จะ `TRUNCATE ... RESTART IDENTITY` ก่อนเสมอ **id จึงเริ่มที่ 1 ทุกครั้ง** ค่าที่ใช้ทดสอบจึงคงที่

| ตาราง | จำนวน | รายละเอียด |
|---|---|---|
| `users` | 4 | สมชาย (id 1, customer) · มานี (id 2, customer) · วิชัย (id 3, staff) · แอดมิน (id 4, admin) |
| `products` | 4 | เสื้อโปโล · ฮู้ดดี้ (พรีออเดอร์) · แก้วเก็บความเย็น · สายคล้องบัตร |
| `product_variants` | 9 | โปโล 4 ไซส์ · ฮู้ดดี้ 2 สี · แก้ว 2 สี · สายคล้อง 1 |
| `orders` | 2 | `ORD-202609-0001` (จ่ายแล้ว รอรับ) · `ORD-202609-0002` (รอตรวจสลิป) |
| `order_items` | 3 | |
| `pickup_logs` | 1 | |

ค่าที่ใช้ทดสอบ: `user_id=1` · `staff_id=3` · `product_id=1` · `variant_id=3` · `order_id=1` · `pickup_code=PICKUP-88421`

---

## 6. ตรวจสอบฐานข้อมูลด้วย psql

> **บน Windows คำสั่ง `psql` มักใช้ไม่ได้ทันที** เพราะ installer ไม่ได้เพิ่มลง PATH
> ตัวโปรแกรมอยู่ที่ `C:\Program Files\PostgreSQL\<เวอร์ชัน>\bin\psql.exe`
> เรียกแบบเต็ม path ได้เลย หรือเพิ่มโฟลเดอร์ `bin` เข้า PATH ของ Windows
> ทางที่ง่ายกว่าคือใช้ `npx prisma studio` หรือ pgAdmin ซึ่งเป็นหน้าเว็บ/GUI

```bash
psql -U postgres -d csmju_shop

\dt                                  -- ดูตารางทั้งหมด
\d orders                            -- ดูโครงสร้างตาราง orders
SELECT * FROM users;
SELECT o.order_number, u.fullname, o.total_amount, o.order_status
  FROM orders o JOIN users u ON u.user_id = o.user_id;
\q
```
