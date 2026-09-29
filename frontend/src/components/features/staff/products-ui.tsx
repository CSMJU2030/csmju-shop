/**
 * ชิ้นส่วน UI ที่หน้า "จัดการสินค้า" และ "สต็อกและพรีออเดอร์" ใช้ร่วมกัน
 * ประกอบจาก class ใน @/csmju/ui.ts + token เท่านั้น (component ชั่วคราวจนกว่า design system จะมีให้)
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";

/** วงแหวน focus ของปุ่ม (design-system.md ข้อ 7.2 — ui.ts ยังไม่มีให้) */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";

/** ปุ่ม tonal (design-system.md ข้อ 7.2) — ใช้เมื่อพื้นที่นั้นมีปุ่มหลักอยู่แล้ว */
export const tonalButtonClass = `flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary-container/10 px-4 py-2.5 text-label-md text-primary-container transition-colors hover:bg-primary-container/20 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;

/** Tag หมวดหมู่ (design-system.md ข้อ 7.2.1) */
export function CategoryTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex whitespace-nowrap rounded-full bg-surface-variant px-2.5 py-1 text-label-sm text-on-surface-variant">
      {children}
    </span>
  );
}

/**
 * ปุ่มที่มีสถานะ loading (btn-loading + aria-busy + กดซ้ำไม่ได้) — ใช้กับปุ่มพื้นเข้ม (primaryButtonClass)
 * เพราะจุด 3 จุดของ .dots เป็นสีขาว
 */
export function LoadingButton({
  loading = false,
  className = "",
  children,
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      className={`${className} relative ${focusRing} ${loading ? "btn-loading" : ""} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <span className="btn-text flex items-center gap-2">{children}</span>
      <span className="dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </button>
  );
}
