# START — ขั้นตอนเปิดใช้งาน CSMJU-Shop ทีละขั้น

คู่มือลัดสำหรับเปิดระบบขึ้นมาใช้ตั้งแต่ต้นจนยิง Postman ได้
(รายละเอียดเต็มอยู่ใน [README.md](README.md) · endpoint ทั้งหมดอยู่ใน [API.md](API.md))

เปิด **PowerShell** แล้วเข้าโฟลเดอร์โปรเจกต์ก่อน

```powershell
cd C:\Users\krits\Desktop\csmju-shop
```

---

## ขั้นที่ 1 — เช็กว่า PostgreSQL ทำงานอยู่

```powershell
Get-Service postgresql*
```

ต้องเห็น `Status` เป็น **Running**

ถ้าเป็น `Stopped` ให้สั่งเปิด (เลขเวอร์ชันตามที่ติดตั้งในเครื่อง)

```powershell
Start-Service postgresql-x64-17
```

> ถ้าคำสั่งฟ้องว่าไม่มีสิทธิ์ ให้เปิด PowerShell แบบ **Run as Administrator**

---

## ขั้นที่ 2 — ติดตั้ง dependencies

**ทำครั้งเดียว** ตอนเพิ่งโหลดโปรเจกต์มา หรือตอนที่ `package.json` เปลี่ยน

```powershell
npm install
```

เช็กว่าเรียบร้อยไหม: ต้องมีโฟลเดอร์ `node_modules\@nestjs` โผล่ขึ้นมา

---

## ขั้นที่ 3 — สร้างตารางในฐานข้อมูล

**ทำครั้งเดียว** ตอนตั้งเครื่องใหม่

```powershell
npx prisma migrate deploy
npx prisma generate
```

- `migrate deploy` สร้างฐานข้อมูล `csmju_shop` ให้เองถ้ายังไม่มี แล้วสร้างตารางทั้ง 6 ตาราง
- `generate` สร้าง Prisma Client ที่โค้ดเรียกใช้

> **รันสองคำสั่งนี้ซ้ำทุกครั้งที่ได้โค้ดใหม่ที่แก้ `prisma/schema.prisma`** เช่นรอบที่เพิ่มคอลัมน์รูปสินค้า
> ถ้าไม่รัน ฐานข้อมูลจะยังไม่มีคอลัมน์ใหม่ แล้วหน้าเว็บจะขึ้น error ตอนบันทึกสินค้า

เช็กว่าเรียบร้อยไหม:

```powershell
npx prisma migrate status
```

ต้องขึ้นว่า **Database schema is up to date!**

> เจอ `Error: P3005 The database schema is not empty` → สั่ง `npx prisma migrate reset --force` แล้วกลับมาทำขั้นนี้ใหม่

---

## ขั้นที่ 4 — ใส่ข้อมูลตัวอย่าง

```powershell
npm run seed
```

จะได้ผู้ใช้ 4 คน สินค้า 4 ชิ้น (9 ตัวเลือก) คำสั่งซื้อ 2 รายการ และท้าย ๆ จะพิมพ์ค่าที่ใช้ทดสอบออกมาให้

```
user_id (customer) = 1
staff_id           = 3
product_id (polo)  = 1
variant_id (Size L)= 3
order_id           = 1
pickup_code        = PICKUP-88421
```

> สั่งซ้ำได้ตลอด — จะล้างข้อมูลเดิมแล้วใส่ใหม่ โดย id เริ่มที่ 1 เสมอ
> เหมาะกับตอนที่ยิง Postman มั่ว ๆ จนข้อมูลเละแล้วอยากรีเซ็ต

---

## ขั้นที่ 5 — เปิดเซิร์ฟเวอร์

```powershell
npm run dev
```

รอจนขึ้นบรรทัดนี้

```
[Nest] LOG [PrismaService] เชื่อมต่อฐานข้อมูล PostgreSQL (csmju_shop) สำเร็จ
[Nest] LOG [NestApplication] Nest application successfully started
[Nest] LOG [Bootstrap] CSMJU-Shop API ทำงานที่ http://localhost:3000
```

⚠️ **หน้าต่างนี้ต้องเปิดค้างไว้ตลอด** ถ้าปิดหรือกด `Ctrl+C` เซิร์ฟเวอร์จะดับ
ถ้าจะรันคำสั่งอื่นระหว่างนี้ ให้เปิด PowerShell **อีกหน้าต่างหนึ่ง**

---

## ขั้นที่ 6 — เช็กว่าระบบพร้อม

เปิดเบราว์เซอร์ไปที่ <http://localhost:3000/api/health>

ต้องได้แบบนี้

```json
{
  "success": true,
  "message": "CSMJU-Shop API พร้อมใช้งาน",
  "data": { "database": "connected", "timestamp": "..." }
}
```

ถ้าได้ `database: connected` แปลว่าพร้อมยิง Postman แล้ว

---

## ขั้นที่ 7 — Import เข้า Postman

**ทำครั้งเดียว**

1. เปิด Postman → กด **Import** (มุมซ้ายบน)
2. ลากไฟล์สองอันนี้เข้าไป
   - `postman\CSMJU-Shop.postman_collection.json`
   - `postman\CSMJU-Shop.postman_environment.json`
3. กด **Import**
4. **มุมขวาบน เลือก Environment เป็น `CSMJU-Shop Local`** ← ลืมขั้นนี้บ่อยที่สุด ถ้าไม่เลือกจะยิงไม่ออกสักอัน

---

## ขั้นที่ 8 — ยิงทดสอบ

**แบบรันรวดเดียวทั้งชุด (แนะนำ)**

คลิกขวาที่ collection **CSMJU-Shop API** → **Run collection** → กด **Run**

ผลที่ควรได้: **52 requests / 129 assertions ผ่านทั้งหมด 0 failed**

**แบบยิงทีละอัน**

เลือก request ทางซ้ายแล้วกด **Send** แต่ต้องไล่ตามลำดับโฟลเดอร์ 00 → 08
เพราะโฟลเดอร์หลัง ๆ ใช้ id ที่โฟลเดอร์ก่อนหน้าเก็บไว้ในตัวแปร

---

## สรุปสั้น ๆ

**ครั้งแรกสุด** ทำขั้น 1 → 8 ตามลำดับ

**ครั้งต่อ ๆ ไป** เหลือแค่

```powershell
cd C:\Users\krits\Desktop\csmju-shop
npm run dev
```

แล้วเปิด Postman ยิงได้เลย (ถ้าอยากรีเซ็ตข้อมูลก็ `npm run seed` ก่อน)

---

## เจอปัญหา

| อาการ | วิธีแก้ |
|---|---|
| `ECONNREFUSED 127.0.0.1:3000` ใน Postman | ลืมเปิดเซิร์ฟเวอร์ → ขั้นที่ 5 |
| `database: disconnected` ที่ /api/health | PostgreSQL ไม่ได้รัน → ขั้นที่ 1 |
| ทุก request ขึ้น `Invalid URL` | ลืมเลือก Environment → ขั้นที่ 7 ข้อ 4 |
| `GET /api/users/1` ได้ 404 | ยังไม่ได้ seed → ขั้นที่ 4 |
| `Error: P3005` | `npx prisma migrate reset --force` แล้วทำขั้น 3–4 ใหม่ |
| `Cannot find module '@nestjs/core'` | ยังไม่ได้ติดตั้ง → ขั้นที่ 2 |
| ทุก request ได้ 404 ทั้งที่เซิร์ฟเวอร์รันอยู่ | ลืมใส่ `/api` นำหน้า path |

ดูตารางแก้ปัญหาฉบับเต็มได้ที่ [POSTMAN.md](POSTMAN.md)
