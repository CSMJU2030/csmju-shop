/**
 * Skeleton ของหน้าฝั่งลูกค้า — รูปร่างใกล้เคียงเนื้อหาจริง ไม่ใช้ spinner (design-system.md ข้อ 9.1)
 * ใช้ได้ทั้งใน loading.tsx (server) และในสถานะ loading ของ client component
 */
import { cardClass } from "@/csmju";
import { SkeletonBar } from "@/components/shared/states";

function Busy({ children, className = "space-y-8" }: { children: React.ReactNode; className?: string }) {
  return (
    <div aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">กำลังโหลดข้อมูล...</span>
      {children}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <SkeletonBar className="h-8 w-48" />
      <SkeletonBar className="h-5 w-full max-w-sm" />
    </div>
  );
}

/** การ์ดสินค้าในกริด */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`${cardClass} flex flex-col`}>
          <SkeletonBar className="aspect-4/3 w-full rounded-none" />
          <div className="space-y-3 p-6">
            <SkeletonBar className="h-5 w-20" />
            <SkeletonBar className="h-6 w-3/4" />
            <SkeletonBar className="h-5 w-1/2" />
            <SkeletonBar className="h-11 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** แถบเครื่องมือ (ค้นหา + ตัวกรอง + ปุ่มขวา) */
function ToolbarSkeleton() {
  return (
    <div className="flex flex-col gap-3 border-b border-outline-variant/40 px-6 py-5 md:flex-row">
      <SkeletonBar className="h-11 flex-1" />
      <SkeletonBar className="h-11 md:w-48" />
      <SkeletonBar className="h-11 md:w-48" />
      <SkeletonBar className="h-11 md:w-40" />
    </div>
  );
}

export function CatalogueSkeleton() {
  return (
    <Busy>
      <PageHeaderSkeleton />
      <div className={cardClass}>
        <ToolbarSkeleton />
        <ProductGridSkeleton />
      </div>
    </Busy>
  );
}

export function CheckoutSkeleton() {
  return (
    <Busy>
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <div className={cardClass}>
            <div className="border-b border-outline-variant/40 px-6 py-5">
              <SkeletonBar className="h-7 w-40" />
            </div>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex gap-4 border-b border-outline-variant/40 px-6 py-4 last:border-0">
                <SkeletonBar className="h-20 w-20 shrink-0" />
                <div className="flex-1 space-y-2">
                  <SkeletonBar className="h-6 w-2/3" />
                  <SkeletonBar className="h-5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
          <div className={`${cardClass} space-y-4 p-6`}>
            <SkeletonBar className="h-7 w-40" />
            <SkeletonBar className="h-20" />
            <SkeletonBar className="h-11" />
            <SkeletonBar className="h-11" />
          </div>
        </div>
        <div className={`${cardClass} space-y-4 self-start p-6`}>
          <SkeletonBar className="h-7 w-32" />
          <SkeletonBar className="h-5" />
          <SkeletonBar className="h-5" />
          <SkeletonBar className="h-8" />
          <SkeletonBar className="h-11" />
        </div>
      </div>
    </Busy>
  );
}

export function TableRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="border-b border-outline-variant/40 px-6 py-4 last:border-0">
          <SkeletonBar />
        </div>
      ))}
    </>
  );
}

export function OrdersSkeleton() {
  return (
    <Busy>
      <PageHeaderSkeleton />
      <div className={cardClass}>
        <div className="flex flex-col gap-3 border-b border-outline-variant/40 px-6 py-5 md:flex-row">
          <SkeletonBar className="h-11 flex-1" />
          <SkeletonBar className="h-11 md:w-48" />
        </div>
        <div className="border-b border-outline-variant/40 bg-surface px-6 py-4">
          <SkeletonBar className="h-5 w-2/3" />
        </div>
        <TableRowsSkeleton />
      </div>
    </Busy>
  );
}

export function OrderDetailSkeleton() {
  return (
    <Busy>
      <SkeletonBar className="h-5 w-40" />
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <div className={`${cardClass} space-y-4 p-6`}>
            <SkeletonBar className="h-7 w-48" />
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-4">
                <SkeletonBar className="h-6 w-6 shrink-0 rounded-full" />
                <SkeletonBar className="h-5 flex-1" />
              </div>
            ))}
          </div>
          <div className={cardClass}>
            <div className="border-b border-outline-variant/40 px-6 py-5">
              <SkeletonBar className="h-7 w-40" />
            </div>
            <TableRowsSkeleton rows={3} />
          </div>
        </div>
        <div className={`${cardClass} flex flex-col items-center gap-4 self-start p-6`}>
          <SkeletonBar className="h-7 w-32" />
          <SkeletonBar className="h-44 w-44" />
          <SkeletonBar className="h-5 w-40" />
        </div>
      </div>
    </Busy>
  );
}
