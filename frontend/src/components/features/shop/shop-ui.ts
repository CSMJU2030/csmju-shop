/**
 * class และ helper ที่ใช้ร่วมกันในหน้าฝั่งลูกค้าของร้านค้า
 * ประกอบจาก token ใน globals.css เท่านั้น (design-system.md ข้อ 3, 7.2)
 * component ชั่วคราว — ปุ่ม tonal และวงแหวน focus ยังไม่มีใน @/csmju/ui.ts (ขอเพิ่มตามข้อ 17.4)
 */
import { formatMoney } from "@/lib/format";
import type { Product, ProductVariant } from "@/lib/types";

/** วงแหวน focus 2px + offset 2px (design-system.md ข้อ 7.2) */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";

/** ปุ่ม tonal — ลิงก์/การกระทำรองที่ต้องการน้ำหนักระดับปุ่ม (design-system.md ข้อ 7.2) */
export const tonalButtonClass = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-container/10 px-4 py-2.5 text-label-md text-primary-container transition-colors hover:bg-primary-container/20 disabled:cursor-not-allowed disabled:opacity-40 md:min-h-0 ${focusRing}`;

/** ลิงก์ข้อความ "ดูรายละเอียด" / "กลับ…" */
export const linkClass = `inline-flex items-center gap-1.5 rounded-lg text-label-md text-primary-container hover:underline ${focusRing}`;

/** หัวการ์ด (design-system.md ข้อ 7.2.1 Card) */
export const cardHeaderClass = "border-b border-outline-variant/40 px-6 py-5";
export const cardTitleClass = "font-display text-headline-md text-on-surface";

/** ราคาต่ำสุด–สูงสุดของสินค้า (สตางค์) */
export function priceRange(product: Product): string | null {
  const prices = product.variants.map((v) => v.price);
  if (prices.length === 0) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`;
}

/** ปิดรับพรีออเดอร์แล้วหรือยัง */
export function isPreorderClosed(product: Product, now: number = Date.now()): boolean {
  if (!product.isPreorder || !product.preorderEndDate) return false;
  const end = new Date(product.preorderEndDate).getTime();
  return !Number.isNaN(end) && end < now;
}

/**
 * เหตุผลที่ยังเพิ่มตัวเลือกนี้ลงตะกร้าไม่ได้ — null = เพิ่มได้
 * สินค้าพรีออเดอร์สั่งได้แม้สต็อกเป็น 0 (backend ตัดสต็อกติดลบได้)
 */
export function variantBlockedReason(
  product: Product,
  variant: ProductVariant,
  inCart: number,
  preorderClosed: boolean,
): string | null {
  if (product.isPreorder) {
    if (preorderClosed) return "ปิดรับพรีออเดอร์แล้ว";
    if (inCart >= 99) return "สั่งได้สูงสุด 99 ชิ้นต่อรายการ";
    return null;
  }
  if (variant.stockQuantity <= 0) return "สินค้าหมด";
  if (inCart >= variant.stockQuantity) return "อยู่ในตะกร้าครบจำนวนคงเหลือแล้ว";
  if (inCart >= 99) return "สั่งได้สูงสุด 99 ชิ้นต่อรายการ";
  return null;
}

/** ตรวจรูปแบบ UUID (path param ของคำสั่งซื้อ) */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
