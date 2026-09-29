"use client";

/**
 * แปลง ApiError เป็น UI ตามตาราง error.code (design-system.md ข้อ 9.3)
 * UNAUTHORIZED → ไม่แสดงอะไร (lib/api.ts พาไป SSO ของ Core Hub แล้ว)
 */
import { ApiError } from "@/lib/api";
import { EmptyState, ErrorState, ForbiddenState, SkeletonBar } from "./states";

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "INTERNAL_ERROR") return "ระบบขัดข้องชั่วคราว กรุณาลองอีกครั้ง หากยังพบปัญหา กรุณาแจ้งผู้ดูแลระบบ";
    return error.message;
  }
  return "ระบบขัดข้องชั่วคราว กรุณาลองอีกครั้ง";
}

export function ApiErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (error instanceof ApiError) {
    if (error.code === "UNAUTHORIZED") {
      return (
        <div className="px-6 py-12">
          <SkeletonBar className="mx-auto h-6 w-48" />
        </div>
      );
    }
    if (error.code === "FORBIDDEN") return <ForbiddenState />;
    if (error.code === "NOT_FOUND") {
      return (
        <EmptyState title="ไม่พบข้อมูลที่คุณกำลังค้นหา" description="อาจถูกลบไปแล้วหรือลิงก์ไม่ถูกต้อง" />
      );
    }
  }
  return <ErrorState message={errorMessage(error)} onRetry={onRetry} />;
}
