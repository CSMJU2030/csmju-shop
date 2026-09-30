/** ฿1,040.00 */
export function baht(value) {
  const n = Number(value ?? 0);
  return '฿' + n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 15 ก.ย. 69 */
export function thaiDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

/** 15 ก.ย. 69 14:30 */
export function thaiDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const ORDER_STATUS_TH = {
  pending: 'รอดำเนินการ',
  confirmed: 'ยืนยันแล้ว',
  preparing: 'กำลังผลิต',
  ready_for_pickup: 'พร้อมรับสินค้า',
  shipped: 'จัดส่งแล้ว',
  completed: 'สำเร็จ',
  cancelled: 'ยกเลิก',
};

export const PAYMENT_STATUS_TH = {
  pending: 'รอชำระเงิน',
  waiting_verify: 'รอตรวจสลิป',
  paid: 'ชำระเงินแล้ว',
  rejected: 'สลิปไม่ผ่าน',
  refunded: 'คืนเงินแล้ว',
};

/** ลำดับสถานะที่ใช้วาดไทม์ไลน์ในบัตรรับสินค้า (แบบมารับที่สาขา) */
export const PICKUP_TIMELINE = [
  { key: 'confirmed', th: 'ชำระเงินแล้ว', en: 'Payment Received' },
  { key: 'preparing', th: 'กำลังผลิต', en: 'In Production' },
  { key: 'ready_for_pickup', th: 'พร้อมรับสินค้า', en: 'Ready for Pickup' },
  { key: 'completed', th: 'สำเร็จ', en: 'Completed' },
];

/** ไทม์ไลน์ของออร์เดอร์แบบจัดส่ง — ขั้นที่ 3 คือส่งเข้าขนส่งแล้ว ไม่ใช่รอมารับ */
export const DELIVERY_TIMELINE = [
  { key: 'confirmed', th: 'ชำระเงินแล้ว', en: 'Payment Received' },
  { key: 'preparing', th: 'กำลังเตรียมพัสดุ', en: 'Packing' },
  { key: 'shipped', th: 'ส่งเข้าขนส่งแล้ว', en: 'Shipped' },
  { key: 'completed', th: 'ได้รับพัสดุแล้ว', en: 'Delivered' },
];
