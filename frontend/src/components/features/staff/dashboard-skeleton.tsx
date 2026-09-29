import { cardClass } from "@/csmju";
import { SkeletonBar, TableSkeleton } from "@/components/shared/states";

/** skeleton ของหน้าภาพรวมร้านค้า — การ์ดสถิติ 4 ใบ + สรุปตามสถานะ 2 การ์ด + รายการรอตรวจสลิป */
export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-8">
      <span className="sr-only">กำลังโหลดข้อมูล...</span>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`${cardClass} flex min-h-40 flex-col justify-between p-6`}>
            <div className="flex items-start justify-between gap-3">
              <SkeletonBar className="h-5 w-28" />
              <SkeletonBar className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <SkeletonBar className="h-10 w-24" />
              <SkeletonBar className="h-4 w-36" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className={cardClass}>
            <div className="border-b border-outline-variant/40 px-6 py-5">
              <SkeletonBar className="h-8 w-48" />
            </div>
            <TableSkeleton rows={4} />
          </div>
        ))}
      </div>
      <div className={cardClass}>
        <div className="border-b border-outline-variant/40 px-6 py-5">
          <SkeletonBar className="h-8 w-56" />
        </div>
        <TableSkeleton rows={5} />
      </div>
    </div>
  );
}

/** skeleton ของทั้ง route (หัวหน้า + เนื้อหา) ใช้ใน loading.tsx */
export function DashboardRouteSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <SkeletonBar className="h-8 w-48" />
        <SkeletonBar className="h-5 w-72" />
      </div>
      <DashboardSkeleton />
    </div>
  );
}
