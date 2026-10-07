/**
 * ชิ้นส่วน UI เล็ก ๆ ที่หน้าเจ้าหน้าที่ (ภาพรวม / คำสั่งซื้อ / จุดรับสินค้า) ใช้ร่วมกัน
 * ประกอบจาก class ใน @/csmju/ui.ts + token เท่านั้น — component ชั่วคราวจนกว่า design system จะมี Button แบบ loading ให้
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { dangerButtonClass, primaryButtonClass } from "@/csmju";

/** วงแหวน focus-visible ตาม design-system.md ข้อ 7.2 (ui.ts ยังไม่มีให้) */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";

/** .custom-checkbox ซ่อนวงแหวน focus ของช่องติ๊ก จึงแสดงวงแหวน focus ที่ label แทน */
export const checkboxLabelClass =
  "custom-checkbox flex items-start gap-3 rounded text-body-md text-on-surface has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary-container";

/** ปุ่ม tonal (design-system.md ข้อ 7.2) — ยังไม่มีค่าคงที่ใน ui.ts */
export const tonalButtonClass = `inline-flex items-center gap-2 rounded-lg bg-primary-container/10 px-3 py-2 text-label-md text-primary-container transition-colors hover:bg-primary-container/20 ${focusRing}`;

/** ลิงก์ข้อความ ("ดูทั้งหมด") */
export const linkClass = `rounded text-label-md text-primary-container hover:underline ${focusRing}`;

/** หัวการ์ดมาตรฐาน (design-system.md ข้อ 7.2.1 Card) */
export function CardHeader({ title, action, id }: { title: string; action?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/40 px-6 py-5">
      <h2 id={id} className="font-display text-headline-md text-on-surface">
        {title}
      </h2>
      {action}
    </div>
  );
}

/**
 * ปุ่มที่มีสถานะ loading (btn-loading + aria-busy) — ระหว่าง busy ปุ่มกดซ้ำไม่ได้
 * (pointer-events: none จาก .btn-loading และผู้เรียกต้องเช็ก busy ใน handler กันการกด Enter ซ้ำ)
 */
export function BusyButton({
  busy,
  tone = "primary",
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { busy: boolean; tone?: "primary" | "danger" }) {
  const base = tone === "danger" ? dangerButtonClass : primaryButtonClass;
  return (
    <button
      type={type}
      {...rest}
      aria-busy={busy}
      className={`${base} relative ${focusRing} disabled:cursor-not-allowed disabled:opacity-40 ${busy ? "btn-loading" : ""} ${className}`}
    >
      <span className="btn-text flex items-center justify-center gap-2">{children}</span>
      <span className="dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </button>
  );
}
