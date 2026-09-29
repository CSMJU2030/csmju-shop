/**
 * สถานะหน้าจอมาตรฐาน (design-system.md ข้อ 9) — ประกอบจาก class ใน @/csmju/ui.ts + token เท่านั้น
 * component ชั่วคราวจนกว่า @csmju2030/design-system จะมี EmptyState / ErrorState / Skeleton ให้
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { DescriptionIcon, cardClass, primaryButtonClass, secondaryButtonClass } from "@/csmju";
import { CORE_HUB_PORTAL_URL } from "@/lib/auth-links";
import { ErrorIcon, LockClockIcon, RefreshIcon } from "./shop-icons";

/** ไอคอน + อธิบายว่าทำไมว่าง + ปุ่มทางออก */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center text-outline">
        {icon ?? <DescriptionIcon className="h-10 w-10" />}
      </div>
      <p className="text-body-md text-on-surface">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-body-md text-on-surface-variant">{description}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

/** กรณีทั้งหน้าเข้าไม่ได้ (FORBIDDEN 403) */
export function ForbiddenState({ message }: { message?: string }) {
  return (
    <div role="alert" className={`${cardClass} px-6 py-12 text-center`}>
      <LockClockIcon className="mx-auto mb-3 h-10 w-10 text-outline" />
      <h2 className="mb-2 font-display text-headline-md text-on-surface">ไม่มีสิทธิ์เข้าถึง</h2>
      <p className="mx-auto max-w-md text-body-md text-on-surface-variant">
        {message ?? "คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบย่อยนี้"}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className={secondaryButtonClass}>
          กลับหน้าหลัก
        </Link>
        <a href={CORE_HUB_PORTAL_URL} className={secondaryButtonClass}>
          กลับ Core Hub
        </a>
      </div>
    </div>
  );
}

/** error ของทั้งพื้นที่ (INTERNAL_ERROR / เชื่อมต่อไม่ได้) + ปุ่มลองอีกครั้ง */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="px-6 py-12 text-center">
      <ErrorIcon className="mx-auto mb-3 h-10 w-10 text-error" />
      <p className="text-body-md text-on-surface">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={`${primaryButtonClass} mx-auto mt-6`}>
          <RefreshIcon className="h-4 w-4" />
          ลองอีกครั้ง
        </button>
      )}
    </div>
  );
}

/** ข้อความแจ้งผลแบบ inline (ผิดพลาดของทั้งฟอร์ม / ความขัดแย้ง / แจ้งเตือน) */
export function Alert({
  tone = "error",
  title,
  children,
}: {
  tone?: "error" | "warning" | "info" | "success";
  title?: string;
  children: ReactNode;
}) {
  const styles = {
    error: "bg-error-container text-on-error-container",
    warning: "bg-amber-100 text-amber-800",
    info: "bg-primary-container/10 text-primary-container",
    success: "bg-success/10 text-emerald-700",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-lg px-4 py-3 text-body-md ${styles}`}>
      {title && <p className="font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}

/** แถบ skeleton — ใช้ประกอบ loading ที่มีรูปร่างใกล้เนื้อหาจริง */
export function SkeletonBar({ className = "h-6" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-container ${className}`} />;
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">กำลังโหลดข้อมูล...</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="border-b border-outline-variant/40 px-6 py-4 last:border-0">
          <SkeletonBar />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      <span className="sr-only">กำลังโหลดข้อมูล...</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`${cardClass} space-y-3 p-6`}>
          <SkeletonBar className="h-40" />
          <SkeletonBar className="h-6 w-3/4" />
          <SkeletonBar className="h-5 w-1/2" />
        </div>
      ))}
    </div>
  );
}
