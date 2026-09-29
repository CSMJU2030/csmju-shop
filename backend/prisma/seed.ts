/**
 * CSMJU Shop — ข้อมูลตัวอย่างสำหรับเครื่อง dev
 * รัน: pnpm --filter backend db:seed   (ล้างข้อมูลเดิมทั้งหมดใน shop_db ก่อนใส่ใหม่)
 *
 * ราคาเป็นสตางค์ · คำสั่งซื้อตัวอย่างผูกกับบัญชี dev ของ Core Hub (student@core.local = user-002)
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const baht = (value: number) => Math.round(value * 100);

async function main() {
  console.log('กำลังใส่ข้อมูลตัวอย่าง...');

  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "pickup_logs", "order_items", "orders", "product_variants", "products" CASCADE',
  );

  const polo = await prisma.product.create({
    data: {
      name: 'เสื้อโปโลสาขาวิทยาการคอมพิวเตอร์ แม่โจ้ (CSMJU Polo 2026)',
      description: 'เสื้อโปโลเนื้อผ้าคุณภาพดี ปักตราสาขา CSMJU สีดำ-เขียว',
      category: 'เสื้อผ้า',
      variants: {
        create: [
          { variantName: 'Size S', price: baht(350), stockQuantity: 30 },
          { variantName: 'Size M', price: baht(350), stockQuantity: 50 },
          { variantName: 'Size L', price: baht(350), stockQuantity: 40 },
          { variantName: 'Size XL', price: baht(370), stockQuantity: 25 },
        ],
      },
    },
    include: { variants: true },
  });

  const hoodie = await prisma.product.create({
    data: {
      name: 'เสื้อฮู้ดดี้ CSMJU Hoodie Pre-Order Edition',
      description: 'เสื้อกันหนาวฮู้ดดี้รุ่นพิเศษ พรีออเดอร์สำหรับภาคฤดูหนาว',
      category: 'เสื้อผ้าพรีออเดอร์',
      isPreorder: true,
      preorderEndDate: new Date('2026-12-31T16:59:59Z'),
      estimatedDelivery: new Date('2027-01-20'),
      variants: {
        create: [
          { variantName: 'Free Size - สีดำ', price: baht(690), stockQuantity: 100 },
          { variantName: 'Free Size - สีเขียวเข้ม', price: baht(690), stockQuantity: 100 },
        ],
      },
    },
    include: { variants: true },
  });

  const tumbler = await prisma.product.create({
    data: {
      name: 'แก้วเก็บความเย็น CSMJU Tumbler',
      description: 'แก้วสแตนเลสเก็บความเย็น 16 oz สกรีนโลโก้สาขา',
      category: 'ของที่ระลึก',
      variants: {
        create: [
          { variantName: 'สีเขียว', price: baht(259), stockQuantity: 60 },
          { variantName: 'สีขาว', price: baht(259), stockQuantity: 45 },
        ],
      },
    },
    include: { variants: true },
  });

  await prisma.product.create({
    data: {
      name: 'สายคล้องบัตรนักศึกษา CSMJU Lanyard',
      description: 'สายคล้องบัตรพร้อมซองใส ลายสาขาวิทยาการคอมพิวเตอร์',
      category: 'ของที่ระลึก',
      variants: { create: [{ variantName: 'ลายมาตรฐาน', price: baht(89), stockQuantity: 200 }] },
    },
  });

  const poloL = polo.variants.find((v) => v.variantName === 'Size L')!;
  const hoodieBlack = hoodie.variants.find((v) => v.variantName.includes('สีดำ'))!;
  const tumblerGreen = tumbler.variants.find((v) => v.variantName === 'สีเขียว')!;

  // คำสั่งซื้อ 1 — รับที่สาขา ชำระแล้ว พร้อมรับ
  await prisma.order.create({
    data: {
      orderNumber: 'ORD-202609-0001',
      coreUserId: 'user-002',
      customerEmail: 'student@core.local',
      recipientName: 'สมชาย รักเรียน',
      recipientPhone: '0812345678',
      totalAmount: poloL.price + tumblerGreen.price * 2,
      deliveryMethod: 'PICKUP',
      paymentSlip: 'https://example.com/slips/slip_001.jpg',
      paymentStatus: 'PAID',
      orderStatus: 'READY_FOR_PICKUP',
      pickupCode: 'PICKUP-884210',
      orderItems: {
        create: [
          { variantId: poloL.id, quantity: 1, unitPrice: poloL.price },
          { variantId: tumblerGreen.id, quantity: 2, unitPrice: tumblerGreen.price },
        ],
      },
    },
  });

  // คำสั่งซื้อ 2 — จัดส่ง รอตรวจสลิป (มีสินค้าพรีออเดอร์)
  await prisma.order.create({
    data: {
      orderNumber: 'ORD-202609-0002',
      coreUserId: 'user-002',
      customerEmail: 'student@core.local',
      recipientName: 'สมชาย รักเรียน',
      recipientPhone: '0812345678',
      totalAmount: hoodieBlack.price + baht(50),
      deliveryMethod: 'DELIVERY',
      shippingFee: baht(50),
      shippingAddress: '63 หมู่ 4 ต.หนองหาร อ.สันทราย จ.เชียงใหม่ 50290',
      paymentSlip: 'https://example.com/slips/slip_002.jpg',
      paymentStatus: 'WAITING_VERIFY',
      orderItems: {
        create: [
          {
            variantId: hoodieBlack.id,
            quantity: 1,
            unitPrice: hoodieBlack.price,
            isPreorderItem: true,
          },
        ],
      },
    },
  });

  console.log('ใส่ข้อมูลตัวอย่างเรียบร้อย: สินค้า 4 รายการ · คำสั่งซื้อ 2 รายการ');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
