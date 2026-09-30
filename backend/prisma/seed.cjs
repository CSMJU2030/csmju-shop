/**
 * CSMJU-Shop — Seed ข้อมูลตัวอย่าง
 * รันด้วย: npm run seed
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 กำลังใส่ข้อมูลตัวอย่าง...');

  // ล้างข้อมูลเดิมและรีเซ็ตลำดับ id กลับไปเริ่มที่ 1
  // (สำคัญมาก — ทำให้ id ที่ใช้ใน Postman environment คงที่ทุกครั้งที่ seed ใหม่)
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "pickup_logs", "order_items", "orders",
                   "product_variants", "products"
    RESTART IDENTITY CASCADE;
  `);

  // -------------------- 1) ตัวตนผู้ใช้ --------------------
  // ระบบนี้ไม่มีตาราง users — ผู้ใช้เป็นของ Core Hub และอ้างถึงด้วย core_user_id
  // ค่าด้านล่างตรงกับผู้ใช้ตัวอย่างของ Core Hub (user-00x) และตรงกับตัวตนทดสอบในหน้าเว็บ
  const student = {
    core_user_id: 'user-002',
    student_id: '6604101304',
    fullname: 'สมชาย รักเรียน',
    email: 'somchai.r@csmju.ac.th',
    phone: '0812345678',
  };
  const student2 = {
    core_user_id: 'user-004',
    student_id: '6604101305',
    fullname: 'มานี ใจดี',
    email: 'manee.j@csmju.ac.th',
    phone: '0823456789',
  };
  const staff = { core_user_id: 'user-003', fullname: 'วิชัย ดูแลร้าน' };

  /** snapshot ข้อมูลผู้สั่งที่เก็บไว้ในคำสั่งซื้อ */
  const customerOf = (u) => ({
    core_user_id: u.core_user_id,
    customer_name: u.fullname,
    customer_email: u.email,
    customer_phone: u.phone,
    customer_student_id: u.student_id,
  });

  // -------------------- 2) products + variants --------------------
  const polo = await prisma.product.create({
    data: {
      name: 'เสื้อโปโลสาขาวิทยาการคอมพิวเตอร์ แม่โจ้ (CSMJU Polo 2026)',
      description: 'เสื้อโปโลเนื้อผ้าคุณภาพดี ปักตราสาขา CSMJU สีดำ-เขียว',
      category: 'เสื้อผ้า',
      is_preorder: false,
      variants: {
        create: [
          { variant_name: 'Size S', price: 350.0, stock_quantity: 30 },
          { variant_name: 'Size M', price: 350.0, stock_quantity: 50 },
          { variant_name: 'Size L', price: 350.0, stock_quantity: 40 },
          { variant_name: 'Size XL', price: 370.0, stock_quantity: 25 },
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
      is_preorder: true,
      preorder_end_date: new Date('2026-10-31T23:59:59Z'),
      estimated_delivery: new Date('2026-11-20'),
      variants: {
        create: [
          { variant_name: 'Free Size - สีดำ', price: 690.0, stock_quantity: 100 },
          { variant_name: 'Free Size - สีเขียวเข้ม', price: 690.0, stock_quantity: 100 },
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
      is_preorder: false,
      variants: {
        create: [
          { variant_name: 'สีเขียว', price: 259.0, stock_quantity: 60 },
          { variant_name: 'สีขาว', price: 259.0, stock_quantity: 45 },
        ],
      },
    },
    include: { variants: true },
  });

  const lanyard = await prisma.product.create({
    data: {
      name: 'สายคล้องบัตรนักศึกษา CSMJU Lanyard',
      description: 'สายคล้องบัตรพร้อมซองใส ลายสาขาวิทยาการคอมพิวเตอร์',
      category: 'ของที่ระลึก',
      is_preorder: false,
      variants: {
        create: [{ variant_name: 'ลายมาตรฐาน', price: 89.0, stock_quantity: 200 }],
      },
    },
    include: { variants: true },
  });

  console.log(`✅ products: 4 รายการ / variants: ${polo.variants.length + hoodie.variants.length + tumbler.variants.length + lanyard.variants.length} รายการ`);

  // -------------------- 3) orders + order_items --------------------
  const poloL = polo.variants.find((v) => v.variant_name === 'Size L');
  const hoodieBlack = hoodie.variants.find((v) => v.variant_name.includes('สีดำ'));
  const tumblerGreen = tumbler.variants.find((v) => v.variant_name === 'สีเขียว');

  // ออร์เดอร์ที่ 1 — รับหน้าร้าน ชำระแล้ว พร้อมรับ
  const order1 = await prisma.order.create({
    data: {
      order_number: 'ORD-202609-0001',
      ...customerOf(student),
      total_amount: 1040.0,
      delivery_method: 'pickup',
      shipping_fee: 0.0,
      shipping_address: null,
      payment_slip: 'https://example.com/slips/slip_001.jpg',
      payment_status: 'paid',
      order_status: 'ready_for_pickup',
      pickup_code: 'PICKUP-88421',
      order_items: {
        create: [
          { variant_id: poloL.variant_id, quantity: 1, unit_price: 350.0, is_preorder_item: false },
          { variant_id: hoodieBlack.variant_id, quantity: 1, unit_price: 690.0, is_preorder_item: true },
        ],
      },
    },
    include: { order_items: true },
  });

  // ออร์เดอร์ที่ 2 — จัดส่ง รอตรวจสลิป
  const order2 = await prisma.order.create({
    data: {
      order_number: 'ORD-202609-0002',
      ...customerOf(student2),
      total_amount: 568.0,
      delivery_method: 'delivery',
      shipping_fee: 50.0,
      shipping_address: '123 หมู่ 4 ต.หนองหาร อ.สันทราย จ.เชียงใหม่ 50290',
      payment_slip: 'https://example.com/slips/slip_002.jpg',
      payment_status: 'waiting_verify',
      order_status: 'pending',
      pickup_code: null,
      order_items: {
        create: [{ variant_id: tumblerGreen.variant_id, quantity: 2, unit_price: 259.0, is_preorder_item: false }],
      },
    },
    include: { order_items: true },
  });

  // ตัดสต็อกให้สอดคล้องกับออร์เดอร์ที่ seed ไว้
  await prisma.productVariant.update({ where: { variant_id: poloL.variant_id }, data: { stock_quantity: { decrement: 1 } } });
  await prisma.productVariant.update({ where: { variant_id: hoodieBlack.variant_id }, data: { stock_quantity: { decrement: 1 } } });
  await prisma.productVariant.update({ where: { variant_id: tumblerGreen.variant_id }, data: { stock_quantity: { decrement: 2 } } });

  console.log(`✅ orders: ${order1.order_number}, ${order2.order_number}`);

  // -------------------- 4) pickup_logs --------------------
  const log = await prisma.pickupLog.create({
    data: {
      order_id: order1.order_id,
      staff_core_user_id: staff.core_user_id,
      staff_name: staff.fullname,
      notes: 'ตรวจสอบรหัสรับ PICKUP-88421 ถูกต้อง ส่งมอบสินค้าเรียบร้อย',
    },
  });

  console.log(`✅ pickup_logs: 1 รายการ (pickup_id = ${log.pickup_id})`);
  console.log('🎉 ใส่ข้อมูลตัวอย่างเสร็จสมบูรณ์');
  console.log('\n📌 ค่าที่ใช้ทดสอบ Postman:');
  console.log(`   core_user_id (customer) = ${student.core_user_id}`);
  console.log(`   staff_core_user_id      = ${staff.core_user_id}`);
  console.log(`   product_id (polo)  = ${polo.product_id}`);
  console.log(`   variant_id (Size L)= ${poloL.variant_id}`);
  console.log(`   order_id           = ${order1.order_id}`);
  console.log(`   pickup_code        = PICKUP-88421`);
}

main()
  .catch((e) => {
    console.error('❌ Seed ผิดพลาด:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
