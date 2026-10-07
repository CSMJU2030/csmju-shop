"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AddIcon,
  MinusIcon,
  SearchIcon,
  StatusBadge,
  cardClass,
  inputClass,
  secondaryButtonClass,
  tdClass,
  thClass,
} from "@/csmju";
import { ApiError, api, type Page } from "@/lib/api";
import { formatMoney, formatNumber } from "@/lib/format";
import { PERMISSION, can } from "@/lib/permissions";
import type { VariantWithProduct } from "@/lib/types";
import { ApiErrorView, errorMessage } from "@/components/shared/api-error-view";
import { FormField } from "@/components/shared/form-field";
import { Pagination } from "@/components/shared/pagination";
import { useMe } from "@/components/shared/session-context";
import { InventoryIcon } from "@/components/shared/shop-icons";
import { EmptyState, TableSkeleton } from "@/components/shared/states";
import { useToast } from "@/components/shared/toast";
import { CategoryTag, focusRing } from "./products-ui";
import { StockAdjustModal } from "./stock-adjust-modal";
import { StockLevelBadge } from "./stock-level-badge";
import { StockPreorderSummary } from "./stock-preorder-summary";

const PAGE_SIZE = 20;

type StockFilter = "all" | "in" | "out";

const FILTERS: { value: StockFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "in", label: "มีของ" },
  { value: "out", label: "หมด / ค้างผลิต" },
];

type ListState =
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | { status: "ready"; data: Page<VariantWithProduct> };

const stepButtonClass = `flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-variant/50 hover:text-primary-container disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;

export function StockPage() {
  const me = useMe();
  const toast = useToast();
  const canAdjust = can(me?.permissions, PERMISSION.STOCK_UPDATE);

  const [filter, setFilter] = useState<StockFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string | undefined>>({});
  const [adjusting, setAdjusting] = useState<VariantWithProduct | null>(null);
  const [summaryVersion, setSummaryVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setList({ status: "loading" });
    api
      .listVariants({ page, limit: PAGE_SIZE, inStock: filter === "all" ? undefined : filter === "in" })
      .then((data) => {
        if (!cancelled) setList({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!cancelled) setList({ status: "error", error });
      });
    return () => {
      cancelled = true;
    };
  }, [page, filter, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const visible = useMemo(() => {
    if (list.status !== "ready") return [];
    const q = search.trim().toLowerCase();
    if (!q) return list.data.items;
    return list.data.items.filter((v) =>
      [v.product.name, v.product.category, v.variantName].some((s) => s.toLowerCase().includes(q)),
    );
  }, [list, search]);

  const replaceRow = (updated: VariantWithProduct) => {
    setList((prev) =>
      prev.status === "ready"
        ? {
            ...prev,
            data: { ...prev.data, items: prev.data.items.map((v) => (v.id === updated.id ? updated : v)) },
          }
        : prev,
    );
    setSummaryVersion((n) => n + 1);
    toast(`ปรับสต็อก “${updated.product.name} · ${updated.variantName}” เป็น ${formatNumber(updated.stockQuantity)} ชิ้นแล้ว`);
  };

  const quickAdjust = async (variant: VariantWithProduct, delta: number) => {
    if (busy[variant.id]) return;
    setBusy((b) => ({ ...b, [variant.id]: true }));
    setRowErrors((e) => ({ ...e, [variant.id]: undefined }));
    try {
      replaceRow(await api.adjustStock(variant.id, delta));
    } catch (error) {
      if (!(error instanceof ApiError && error.code === "UNAUTHORIZED")) {
        setRowErrors((e) => ({ ...e, [variant.id]: errorMessage(error) }));
      }
    } finally {
      setBusy((b) => ({ ...b, [variant.id]: false }));
    }
  };

  const hasFilter = filter !== "all" || search.trim() !== "";
  const clearFilters = () => {
    setFilter("all");
    setSearch("");
    setPage(1);
  };

  return (
    <div className="space-y-8">
      <section className={cardClass} aria-labelledby="stock-list-title">
        <div className="border-b border-outline-variant/40 px-6 py-5">
          <h2 id="stock-list-title" className="font-display text-headline-md text-on-surface">
            สต็อกรายตัวเลือก
          </h2>
        </div>
        <div className="flex flex-col gap-4 border-b border-outline-variant/40 px-6 py-5 md:flex-row md:items-end">
          <div className="md:flex-1">
            <FormField id="stock-search" label="ค้นหาในหน้านี้" hint="ค้นจากชื่อสินค้า หมวดหมู่ หรือชื่อตัวเลือก">
              <div className="relative">
                <SearchIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-outline"
                />
                <input
                  id="stock-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-describedby="stock-search-hint"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </FormField>
          </div>
          <div className="md:w-48">
            <FormField id="stock-filter" label="สถานะสต็อก">
              <select
                id="stock-filter"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value as StockFilter);
                  setPage(1);
                }}
                className={inputClass}
              >
                {FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          {hasFilter && (
            <button type="button" onClick={clearFilters} className={`${secondaryButtonClass} ${focusRing}`}>
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {list.status === "loading" && <TableSkeleton rows={6} />}

        {list.status === "error" && <ApiErrorView error={list.error} onRetry={reload} />}

        {list.status === "ready" && list.data.items.length === 0 && filter === "all" && (
          <EmptyState
            icon={<InventoryIcon className="h-10 w-10" aria-hidden="true" />}
            title="ยังไม่มีตัวเลือกสินค้า"
            description="สต็อกนับแยกตามตัวเลือกของสินค้า เช่น ไซส์หรือสี เพิ่มสินค้าและตัวเลือกก่อนจึงจะปรับสต็อกได้"
            action={
              <Link href="/staff/products" className={`${secondaryButtonClass} ${focusRing}`}>
                ไปหน้าจัดการสินค้า
              </Link>
            }
          />
        )}

        {list.status === "ready" && list.data.items.length === 0 && filter !== "all" && (
          <EmptyState
            icon={<SearchIcon className="h-10 w-10" aria-hidden="true" />}
            title={filter === "in" ? "ไม่มีตัวเลือกที่ยังมีของ" : "ไม่มีตัวเลือกที่หมดหรือค้างผลิต"}
            description="ลองเปลี่ยนสถานะสต็อก หรือล้างตัวกรองเพื่อดูทุกตัวเลือก"
            action={
              <button type="button" onClick={clearFilters} className={`${secondaryButtonClass} ${focusRing}`}>
                ล้างตัวกรอง
              </button>
            }
          />
        )}

        {list.status === "ready" && list.data.items.length > 0 && visible.length === 0 && (
          <EmptyState
            icon={<SearchIcon className="h-10 w-10" aria-hidden="true" />}
            title="ไม่พบตัวเลือกที่ตรงกับคำค้นหาในหน้านี้"
            description="การค้นหาดูเฉพาะรายการในหน้าที่แสดงอยู่ ลองเปลี่ยนคำค้นหาหรือไปหน้าถัดไป"
            action={
              <button type="button" onClick={() => setSearch("")} className={`${secondaryButtonClass} ${focusRing}`}>
                ล้างตัวกรอง
              </button>
            }
          />
        )}

        {list.status === "ready" && visible.length > 0 && (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-3xl border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant/40 bg-surface text-label-md text-on-surface-variant">
                  <th scope="col" className={thClass}>
                    สินค้า
                  </th>
                  <th scope="col" className={thClass}>
                    ตัวเลือก
                  </th>
                  <th scope="col" className={`${thClass} text-right`}>
                    ราคา
                  </th>
                  <th scope="col" className={`${thClass} text-right`}>
                    คงเหลือ
                  </th>
                  {canAdjust && (
                    <th scope="col" className={`${thClass} text-right`}>
                      ปรับสต็อก
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {visible.map((variant) => {
                  const label = `${variant.product.name} ${variant.variantName}`;
                  const rowBusy = busy[variant.id] === true;
                  const rowError = rowErrors[variant.id];
                  return (
                    <tr
                      key={variant.id}
                      className="border-b border-outline-variant/40 text-body-md last:border-0 hover:bg-surface/50"
                    >
                      <td className={tdClass}>
                        <p className="font-medium text-on-surface">{variant.product.name}</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <CategoryTag>{variant.product.category}</CategoryTag>
                          {variant.product.isPreorder && <StatusBadge tone="info" label="พรีออเดอร์" />}
                        </div>
                      </td>
                      <td className={`${tdClass} text-on-surface`}>{variant.variantName}</td>
                      <td className={`${tdClass} text-right whitespace-nowrap text-on-surface-variant tabular-nums`}>
                        {formatMoney(variant.price)}
                      </td>
                      <td className={`${tdClass} text-right`}>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-body-lg font-semibold text-on-surface tabular-nums">
                            {formatNumber(variant.stockQuantity)}
                          </span>
                          <StockLevelBadge quantity={variant.stockQuantity} isPreorder={variant.product.isPreorder} />
                        </div>
                      </td>
                      {canAdjust && (
                        <td className={`${tdClass} text-right`}>
                          <div className="flex items-center justify-end gap-2" aria-busy={rowBusy || undefined}>
                            <button
                              type="button"
                              onClick={() => quickAdjust(variant, -1)}
                              disabled={rowBusy || variant.stockQuantity <= 0}
                              title={variant.stockQuantity <= 0 ? "จำนวนคงเหลือเป็น 0 หรือต่ำกว่า ลดเพิ่มไม่ได้" : undefined}
                              aria-label={`ลดสต็อก ${label} 1 ชิ้น`}
                              className={stepButtonClass}
                            >
                              <MinusIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => quickAdjust(variant, 1)}
                              disabled={rowBusy}
                              aria-label={`เพิ่มสต็อก ${label} 1 ชิ้น`}
                              className={stepButtonClass}
                            >
                              <AddIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setAdjusting(variant)}
                              disabled={rowBusy}
                              aria-label={`ปรับสต็อก ${label} แบบระบุจำนวน`}
                              className={`${secondaryButtonClass} ${focusRing} whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40`}
                            >
                              ระบุจำนวน
                            </button>
                          </div>
                          {rowError && (
                            <p role="alert" className="mt-2 text-label-md text-error">
                              {rowError}
                            </p>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {list.status === "ready" && list.data.items.length > 0 && (
          <Pagination meta={list.data.meta} onPage={setPage} />
        )}
      </section>

      <StockPreorderSummary version={summaryVersion} />

      {adjusting && (
        <StockAdjustModal
          variant={adjusting}
          onClose={() => setAdjusting(null)}
          onSaved={(updated) => {
            setAdjusting(null);
            setRowErrors((e) => ({ ...e, [updated.id]: undefined }));
            replaceRow(updated);
          }}
        />
      )}
    </div>
  );
}
