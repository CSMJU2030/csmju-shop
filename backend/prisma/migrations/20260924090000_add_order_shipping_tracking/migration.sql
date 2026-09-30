-- ข้อมูลการจัดส่งพัสดุ (ใช้เฉพาะออร์เดอร์แบบ delivery — ว่างได้ ของเดิมจึงไม่พัง)
ALTER TABLE "orders" ADD COLUMN "shipping_carrier" VARCHAR(50);
ALTER TABLE "orders" ADD COLUMN "tracking_number" VARCHAR(50);
ALTER TABLE "orders" ADD COLUMN "shipped_at" TIMESTAMPTZ(6);

-- ค้นหาออร์เดอร์จากเลขพัสดุที่หน้าเจ้าหน้าที่
CREATE INDEX "orders_tracking_number_idx" ON "orders"("tracking_number");
