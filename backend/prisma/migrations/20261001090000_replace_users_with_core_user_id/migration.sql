-- ============================================================
-- เลิกใช้ตาราง users — ตัวตนผู้ใช้เป็นของ Core Hub
-- (data-dictionary.md ข้อ 9.2 · CI check DD-01)
--
-- orders      : user_id  → core_user_id + snapshot ชื่อ/อีเมล/โทร/รหัสนักศึกษา
-- pickup_logs : staff_id → staff_core_user_id + staff_name
--
-- ข้อมูลเดิมไม่หาย: คัดลอกชื่อ/ติดต่อจาก users มาเก็บในคำสั่งซื้อก่อนลบตาราง
-- แถวเดิมได้ core_user_id เป็น "legacy-<เลขเดิม>" เพื่อให้ตามรอยได้
-- ตอนเชื่อม Core Hub ให้ map ค่าเหล่านี้เป็น sub จริงของผู้ใช้แต่ละคน
-- ============================================================

-- orders ------------------------------------------------------
ALTER TABLE "orders"
    ADD COLUMN "core_user_id" VARCHAR(64),
    ADD COLUMN "customer_name" VARCHAR(100),
    ADD COLUMN "customer_email" VARCHAR(100),
    ADD COLUMN "customer_phone" VARCHAR(15),
    ADD COLUMN "customer_student_id" VARCHAR(20);

UPDATE "orders" AS o
SET "core_user_id"        = 'legacy-' || u."user_id",
    "customer_name"       = u."fullname",
    "customer_email"      = u."email",
    "customer_phone"      = u."phone",
    "customer_student_id" = u."student_id"
FROM "users" AS u
WHERE u."user_id" = o."user_id";

ALTER TABLE "orders"
    ALTER COLUMN "core_user_id" SET NOT NULL,
    ALTER COLUMN "customer_name" SET NOT NULL,
    ALTER COLUMN "customer_email" SET NOT NULL,
    ALTER COLUMN "customer_phone" SET NOT NULL;

ALTER TABLE "orders" DROP CONSTRAINT "orders_user_id_fkey";
DROP INDEX "orders_user_id_idx";
ALTER TABLE "orders" DROP COLUMN "user_id";
CREATE INDEX "orders_core_user_id_idx" ON "orders"("core_user_id");

-- pickup_logs -------------------------------------------------
ALTER TABLE "pickup_logs"
    ADD COLUMN "staff_core_user_id" VARCHAR(64),
    ADD COLUMN "staff_name" VARCHAR(100);

UPDATE "pickup_logs" AS p
SET "staff_core_user_id" = 'legacy-' || u."user_id",
    "staff_name"         = u."fullname"
FROM "users" AS u
WHERE u."user_id" = p."staff_id";

ALTER TABLE "pickup_logs"
    ALTER COLUMN "staff_core_user_id" SET NOT NULL,
    ALTER COLUMN "staff_name" SET NOT NULL;

ALTER TABLE "pickup_logs" DROP CONSTRAINT "pickup_logs_staff_id_fkey";
DROP INDEX "pickup_logs_staff_id_idx";
ALTER TABLE "pickup_logs" DROP COLUMN "staff_id";
CREATE INDEX "pickup_logs_staff_core_user_id_idx" ON "pickup_logs"("staff_core_user_id");

-- users -------------------------------------------------------
DROP TABLE "users";
