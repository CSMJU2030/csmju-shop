import { cardClass } from "@/csmju";
import { SkeletonBar, TableSkeleton } from "@/components/shared/states";

/** skeleton ของรายการประวัติการส่งมอบ */
export function PickupLogsSkeleton() {
  return <TableSkeleton rows={5} />;
}

/** skeleton ของทั้ง route จุดรับสินค้า — กล้อง/ช่องรหัส + ผลตรวจ + ประวัติ */
export function PickupRouteSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-8">
      <span className="sr-only">กำลังโหลดข้อมูล...</span>
      <div className="space-y-3">
        <SkeletonBar className="h-8 w-48" />
        <SkeletonBar className="h-5 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <div className={cardClass}>
          <div className="border-b border-outline-variant/40 px-6 py-5">
            <SkeletonBar className="h-8 w-48" />
          </div>
          <div className="space-y-4 p-6">
            <SkeletonBar className="aspect-4/3 w-full" />
            <SkeletonBar className="h-5 w-32" />
            <SkeletonBar className="h-11 w-full" />
          </div>
        </div>
        <div className={cardClass}>
          <div className="border-b border-outline-variant/40 px-6 py-5">
            <SkeletonBar className="h-8 w-40" />
          </div>
          <div className="space-y-4 p-6">
            <SkeletonBar className="h-6 w-2/3" />
            <SkeletonBar className="h-16 w-full" />
            <SkeletonBar className="h-16 w-full" />
          </div>
        </div>
      </div>
      <div className={cardClass}>
        <div className="border-b border-outline-variant/40 px-6 py-5">
          <SkeletonBar className="h-8 w-56" />
        </div>
        <PickupLogsSkeleton />
      </div>
    </div>
  );
}
