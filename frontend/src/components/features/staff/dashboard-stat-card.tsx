import type { ReactNode } from "react";
import { cardClass } from "@/csmju";

/**
 * การ์ดสถิติ (design-system.md ข้อ 7.2.1 StatCard) — component ชั่วคราวจนกว่า design system จะมี StatCard
 * - label ซ้ายบน · กล่องไอคอนขวาบน (highlight = bg-btn-gradient) · ตัวเลข font-display + tabular-nums · คำอธิบาย text-label-sm text-secondary
 * - `unit` แยกหน่วย (เช่น "บาท") ออกจากตัวเลข เพราะ text-display-lg มี letter-spacing ติดลบ ห้ามใช้กับข้อความไทย
 * - `compact` ใช้ตัวเลขขนาด headline สำหรับค่าที่ยาว (ยอดเงิน) ไม่ให้ล้นการ์ดบนจอแคบ
 */
export function DashboardStatCard({
  label,
  value,
  unit,
  hint,
  icon,
  highlight = false,
  compact = false,
}: {
  label: string;
  value: string;
  unit?: string;
  hint: string;
  icon: ReactNode;
  highlight?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`${cardClass} flex min-h-40 flex-col justify-between gap-3 p-6`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-label-md text-on-surface-variant">{label}</p>
        <span
          aria-hidden="true"
          className={`shrink-0 rounded-lg p-2.5 ${
            highlight ? "bg-btn-gradient text-white" : "bg-primary-container/10 text-primary-container"
          }`}
        >
          {icon}
        </span>
      </div>
      <div>
        <p className="flex flex-wrap items-baseline gap-x-2 text-primary-container">
          <span
            className={`font-display tabular-nums ${compact ? "text-headline-lg" : "text-display-lg"}`}
          >
            {value}
          </span>
          {unit && <span className="text-body-md text-on-surface-variant">{unit}</span>}
        </p>
        <p className="mt-1 text-label-sm text-secondary">{hint}</p>
      </div>
    </div>
  );
}
