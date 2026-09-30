/** ส่วนหน้าของเลขที่คำสั่งซื้อของเดือนปัจจุบัน เช่น "ORD-202609-" */
export function orderNumberPrefix(date = new Date()): string {
  const ym = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  return `ORD-${ym}-`;
}

/** สร้างเลขที่คำสั่งซื้อ รูปแบบ ORD-YYYYMM-XXXX */
export function generateOrderNumber(sequence: number, prefix = orderNumberPrefix()): string {
  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

/**
 * อ่านลำดับท้ายเลขที่ออร์เดอร์ออกมาเป็นตัวเลข
 * "ORD-202609-0012" → 12 · รูปแบบไม่ตรงคืน 0
 */
export function orderNumberSequence(orderNumber: string, prefix = orderNumberPrefix()): number {
  if (!orderNumber.startsWith(prefix)) return 0;
  const n = Number(orderNumber.slice(prefix.length));
  return Number.isFinite(n) ? n : 0;
}

/** สร้างรหัสรับสินค้า รูปแบบ PICKUP-XXXXXX */
export function generatePickupCode(): string {
  return `PICKUP-${Math.floor(100000 + Math.random() * 900000)}`;
}

/** สร้าง meta สำหรับ response แบบแบ่งหน้า */
export function buildMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    total_pages: Math.max(1, Math.ceil(total / limit)),
  };
}
