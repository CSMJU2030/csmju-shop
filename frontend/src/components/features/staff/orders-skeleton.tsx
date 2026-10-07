import { cardClass } from "@/csmju";
import { SkeletonBar, TableSkeleton } from "@/components/shared/states";

/** skeleton ของหน้าจัดการคำสั่งซื้อ — แถบค้นหา/ตัวกรอง + แถวตาราง */
export function OrdersRouteSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-8">
      <span className="sr-only">กำลังโหลดข้อมูล...</span>
      <div className="space-y-3">
        <SkeletonBar className="h-8 w-48" />
        <SkeletonBar className="h-5 w-72" />
      </div>
      <div className={cardClass}>
        <div className="flex flex-col gap-4 border-b border-outline-variant/40 px-6 py-5 md:flex-row">
          <SkeletonBar className="h-11 flex-1" />
          <SkeletonBar className="h-11 md:w-48" />
          <SkeletonBar className="h-11 md:w-48" />
          <SkeletonBar className="h-11 md:w-48" />
        </div>
        <TableSkeleton rows={8} />
      </div>
    </div>
  );
}
