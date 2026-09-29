"use client";

import { ArrowBackIcon, ArrowForwardIcon, secondaryButtonClass } from "@/csmju";
import { formatNumber } from "@/lib/format";
import type { PageMeta } from "@/lib/types";

/** แบ่งหน้าตาม meta ของ API (?page=&limit=) */
export function Pagination({ meta, onPage }: { meta: PageMeta; onPage: (page: number) => void }) {
  if (meta.totalPages <= 1) return null;
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);
  return (
    <nav
      aria-label="แบ่งหน้า"
      className="flex flex-col items-center justify-between gap-3 border-t border-outline-variant/40 px-6 py-4 md:flex-row"
    >
      <p className="text-body-md text-on-surface-variant tabular-nums">
        แสดง {formatNumber(from)}–{formatNumber(to)} จาก {formatNumber(meta.total)} รายการ
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          className={`${secondaryButtonClass} flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-40`}
          disabled={meta.page <= 1}
          onClick={() => onPage(meta.page - 1)}
        >
          <ArrowBackIcon className="h-4 w-4" />
          ก่อนหน้า
        </button>
        <button
          type="button"
          className={`${secondaryButtonClass} flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-40`}
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPage(meta.page + 1)}
        >
          ถัดไป
          <ArrowForwardIcon className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
