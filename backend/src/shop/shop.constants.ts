/** ค่าจัดส่งแบบ DELIVERY หน่วยสตางค์ (ตั้งได้ด้วย SHOP_SHIPPING_FEE_SATANG · ค่าเริ่มต้น 50 บาท) */
export function shippingFeeSatang(): number {
  const value = Number(process.env.SHOP_SHIPPING_FEE_SATANG);
  return Number.isInteger(value) && value >= 0 ? value : 5000;
}

/** ส่วนหน้าของเลขที่คำสั่งซื้อของเดือนปัจจุบัน เช่น "ORD-202609-" (เวลาไทย) */
export function orderNumberPrefix(date = new Date()): string {
  const bangkok = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const ym = `${bangkok.getUTCFullYear()}${String(bangkok.getUTCMonth() + 1).padStart(2, '0')}`;
  return `ORD-${ym}-`;
}

/** เลขที่คำสั่งซื้อ รูปแบบ ORD-YYYYMM-XXXX */
export function formatOrderNumber(sequence: number, prefix = orderNumberPrefix()): string {
  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

/** "ORD-202609-0012" → 12 · รูปแบบไม่ตรงคืน 0 */
export function orderNumberSequence(orderNumber: string, prefix = orderNumberPrefix()): number {
  if (!orderNumber.startsWith(prefix)) return 0;
  const n = Number(orderNumber.slice(prefix.length));
  return Number.isInteger(n) ? n : 0;
}

/** รหัสรับสินค้า รูปแบบ PICKUP-XXXXXX */
export function generatePickupCode(random = Math.random): string {
  return `PICKUP-${Math.floor(100000 + random() * 900000)}`;
}

/** Date (คอลัมน์ @db.Date) → "YYYY-MM-DD" ตาม data-dictionary.md */
export function toDateOnly(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}
