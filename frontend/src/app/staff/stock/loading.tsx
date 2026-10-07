import { cardClass } from "@/csmju";
import { SkeletonBar } from "@/components/shared/states";

// Skeleton ที่มีรูปร่างเหมือนหน้าจริง (design-system.md §9.1) — ตารางสต็อก + สรุปพรีออเดอร์
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-8">
      <span className="sr-only">กำลังโหลดข้อมูล...</span>
      <div className="space-y-3">
        <SkeletonBar className="h-8 w-56" />
        <SkeletonBar className="h-5 w-full max-w-lg" />
      </div>
      <div className={cardClass}>
        <div className="flex flex-col gap-4 border-b border-outline-variant/40 px-6 py-5 md:flex-row md:items-end">
          <SkeletonBar className="h-11 md:flex-1" />
          <SkeletonBar className="h-11 md:w-48" />
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="border-b border-outline-variant/40 px-6 py-4 last:border-0">
            <SkeletonBar className="h-8" />
          </div>
        ))}
      </div>
      <div className={cardClass}>
        <div className="border-b border-outline-variant/40 px-6 py-5">
          <SkeletonBar className="h-7 w-48" />
        </div>
        <div className="space-y-4 p-6">
          <SkeletonBar className="h-6 w-2/3" />
          <SkeletonBar className="h-24" />
        </div>
      </div>
    </div>
  );
}
