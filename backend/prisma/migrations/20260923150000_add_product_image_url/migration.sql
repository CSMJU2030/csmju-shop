-- เพิ่มคอลัมน์เก็บที่อยู่รูปสินค้า (ว่างได้ ของเดิมที่มีอยู่แล้วจึงไม่พัง)
ALTER TABLE "products" ADD COLUMN "image_url" VARCHAR(255);
