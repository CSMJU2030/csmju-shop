/**
 * ตัวตนทดสอบ — ใช้ชั่วคราวจนกว่าจะเชื่อม Core Hub
 *
 * ระบบนี้ไม่มีตาราง users (ผู้ใช้เป็นของ Core Hub · data-dictionary ข้อ 9.2)
 * คำสั่งซื้อและบันทึกรับสินค้าจึงอ้างผู้ใช้ด้วย core_user_id
 * ค่า core_user_id ด้านล่างตรงกับผู้ใช้ตัวอย่างของ Core Hub และกับ backend/prisma/seed.cjs
 *
 * เมื่อเชื่อม Core Hub แล้ว ค่าเหล่านี้จะมาจาก token ของผู้ที่ล็อกอินอยู่แทน
 * และให้ลบไฟล์นี้ทิ้ง
 */

export const CUSTOMERS = [
  {
    core_user_id: 'user-002',
    name: 'สมชาย รักเรียน',
    student_id: '6604101304',
    email: 'somchai.r@csmju.ac.th',
    phone: '0812345678',
  },
  {
    core_user_id: 'user-004',
    name: 'มานี ใจดี',
    student_id: '6604101305',
    email: 'manee.j@csmju.ac.th',
    phone: '0823456789',
  },
];

export const STAFF = [
  { core_user_id: 'user-003', name: 'วิชัย ดูแลร้าน', role: 'staff' },
  { core_user_id: 'user-001', name: 'ผู้ดูแลระบบ CSMJU', role: 'admin' },
];

/** แปลงตัวตนผู้สั่งเป็นฟิลด์ที่ POST /api/v1/orders ต้องการ */
export function customerFields(c) {
  return {
    core_user_id: c.core_user_id,
    customer_name: c.name,
    customer_email: c.email,
    customer_phone: c.phone,
    ...(c.student_id ? { customer_student_id: c.student_id } : {}),
  };
}
