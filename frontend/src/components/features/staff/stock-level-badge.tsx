import { StatusBadge, type StatusTone } from "@/csmju";
import { formatNumber } from "@/lib/format";

/** ต่ำกว่าหรือเท่ากับค่านี้ถือว่า "ใกล้หมด" */
export const LOW_STOCK_THRESHOLD = 5;

/**
 * สถานะสต็อกของตัวเลือกสินค้า
 * - ติดลบ (เกิดได้เฉพาะสินค้าพรีออเดอร์) = ยอดที่ต้องสั่งผลิตเพิ่ม
 * - 0 = หมด (พรีออเดอร์ยังสั่งได้)
 * - ≤ 5 = ใกล้หมด
 */
export function stockLevel(quantity: number, isPreorder: boolean): { tone: StatusTone; label: string } {
  if (quantity < 0) return { tone: "warning", label: `ค้างผลิต ${formatNumber(-quantity)} ชิ้น` };
  if (quantity === 0) {
    return isPreorder ? { tone: "info", label: "หมด · รับพรีออเดอร์" } : { tone: "error", label: "หมด" };
  }
  if (quantity <= LOW_STOCK_THRESHOLD) return { tone: "warning", label: "ใกล้หมด" };
  return { tone: "success", label: "มีของ" };
}

export function StockLevelBadge({ quantity, isPreorder }: { quantity: number; isPreorder: boolean }) {
  const { tone, label } = stockLevel(quantity, isPreorder);
  return <StatusBadge tone={tone} label={label} />;
}
