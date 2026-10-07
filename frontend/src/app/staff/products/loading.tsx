import { cardClass } from "@/csmju";
import { SkeletonBar } from "@/components/shared/states";

// Skeleton ที่มีรูปร่างเหมือนหน้าจริง (design-system.md §9.1) — แถบค้นหา/ตัวกรอง + ตารางสินค้า
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-8">
      <span className="sr-only">กำลังโหลดข้อมูล...</span>
      <div className="space-y-3">
        <SkeletonBar className="h-8 w-48" />
        <SkeletonBar className="h-5 w-full max-w-md" />
      </div>
      <div className={cardClass}>
        <div className="flex flex-col gap-4 border-b border-outline-variant/40 px-6 py-5 md:flex-row md:items-end">
          <SkeletonBar className="h-11 md:flex-1" />
          <SkeletonBar className="h-11 md:w-48" />
          <SkeletonBar className="h-11 md:w-32" />
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-outline-variant/40 px-6 py-4 last:border-0">
            <SkeletonBar className="h-12 w-12 shrink-0" />
            <SkeletonBar className="h-6 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
