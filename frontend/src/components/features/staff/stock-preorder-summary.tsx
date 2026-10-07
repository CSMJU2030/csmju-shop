"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EventIcon, StatusBadge, cardClass, secondaryButtonClass, tdClass, thClass } from "@/csmju";
import { api, type Page } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";
import type { Order, Product } from "@/lib/types";
import { ApiErrorView } from "@/components/shared/api-error-view";
import { Alert, EmptyState, SkeletonBar } from "@/components/shared/states";
import { focusRing } from "./products-ui";

const PAGE_SIZE = 100;
const MAX_ORDER_PAGES = 20;
const MAX_PRODUCT_PAGES = 5;

interface Tally {
  /** variantId → จำนวนชิ้นที่ถูกสั่ง (ไม่นับคำสั่งซื้อที่ยกเลิก) */
  ordered: Map<string, number>;
  countedOrders: number;
  totalOrders: number;
}

type State<T> = { status: "loading" } | { status: "error"; error: unknown } | { status: "ready"; data: T };

/** ดึงทุกหน้า (สูงสุด maxPages หน้า) */
async function fetchAll<T>(
  fetchPage: (page: number) => Promise<Page<T>>,
  maxPages: number,
): Promise<{ items: T[]; total: number }> {
  const first = await fetchPage(1);
  const items = [...first.items];
  const last = Math.min(first.meta.totalPages, maxPages);
  for (let page = 2; page <= last; page += 1) {
    items.push(...(await fetchPage(page)).items);
  }
  return { items, total: first.meta.total };
}

function tallyOrders(orders: Order[]): Map<string, number> {
  const ordered = new Map<string, number>();
  for (const order of orders) {
    if (order.orderStatus === "CANCELLED") continue;
    for (const item of order.orderItems) {
      ordered.set(item.variantId, (ordered.get(item.variantId) ?? 0) + item.quantity);
    }
  }
  return ordered;
}

interface VariantRow {
  id: string;
  name: string;
  ordered: number;
  stock: number;
  backlog: number;
}

function rowsOf(product: Product, ordered: Map<string, number>): VariantRow[] {
  return product.variants.map((v) => ({
    id: v.id,
    name: v.variantName,
    ordered: ordered.get(v.id) ?? 0,
    stock: v.stockQuantity,
    backlog: Math.max(0, -v.stockQuantity),
  }));
}

function preorderWindow(product: Product): { tone: "success" | "neutral"; label: string } {
  if (!product.preorderEndDate) return { tone: "neutral", label: "ไม่ระบุวันปิดรับ" };
  return new Date(product.preorderEndDate).getTime() >= Date.now()
    ? { tone: "success", label: "เปิดรับพรีออเดอร์" }
    : { tone: "neutral", label: "ปิดรับแล้ว" };
}

function downloadCsv(products: Product[], ordered: Map<string, number>) {
  const header = ["สินค้า", "ตัวเลือก", "สั่งแล้ว (ชิ้น)", "คงเหลือ (ชิ้น)", "ต้องผลิตเพิ่ม (ชิ้น)", "ปิดรับพรีออเดอร์"];
  const rows = products.flatMap((p) =>
    rowsOf(p, ordered).map((r) => [p.name, r.name, r.ordered, r.stock, r.backlog, formatDate(p.preorderEndDate)]),
  );
  const csv = [header, ...rows]
    .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `preorder-summary-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/** สรุปพรีออเดอร์: ยอดที่ถูกสั่งเทียบกับสต็อก และยอดที่ต้องสั่งผลิตเพิ่ม */
export function StockPreorderSummary({ version }: { version: number }) {
  const [products, setProducts] = useState<State<Product[]>>({ status: "loading" });
  const [tally, setTally] = useState<State<Tally>>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);

  // สินค้าพรีออเดอร์ (โหลดใหม่ทุกครั้งที่มีการปรับสต็อก โดยไม่กระพริบเป็น skeleton)
  useEffect(() => {
    let cancelled = false;
    fetchAll((page) => api.listProducts({ page, limit: PAGE_SIZE, isPreorder: true }), MAX_PRODUCT_PAGES)
      .then(({ items }) => {
        if (!cancelled) setProducts({ status: "ready", data: items });
      })
      .catch((error: unknown) => {
        if (!cancelled) setProducts({ status: "error", error });
      });
    return () => {
      cancelled = true;
    };
  }, [version, retryKey]);

  // ยอดสั่งจากคำสั่งซื้อทั้งหมด (โหลดครั้งเดียว — การปรับสต็อกไม่เปลี่ยนยอดสั่ง)
  useEffect(() => {
    let cancelled = false;
    fetchAll((page) => api.listOrders({ page, limit: PAGE_SIZE }), MAX_ORDER_PAGES)
      .then(({ items, total }) => {
        if (!cancelled) {
          setTally({
            status: "ready",
            data: { ordered: tallyOrders(items), countedOrders: items.length, totalOrders: total },
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setTally({ status: "error", error });
      });
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const retry = useCallback(() => {
    setProducts({ status: "loading" });
    setTally({ status: "loading" });
    setRetryKey((k) => k + 1);
  }, []);

  const ready = products.status === "ready" && tally.status === "ready" ? { products: products.data, tally: tally.data } : null;
  const error = products.status === "error" ? products.error : tally.status === "error" ? tally.error : null;

  return (
    <section className={cardClass} aria-labelledby="preorder-summary-title">
      <div className="flex flex-col gap-3 border-b border-outline-variant/40 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 id="preorder-summary-title" className="font-display text-headline-md text-on-surface">
            สรุปพรีออเดอร์
          </h2>
          <p className="text-body-md text-on-surface-variant">
            ยอดสั่งนับจากคำสั่งซื้อที่ไม่ถูกยกเลิก · คงเหลือติดลบคือยอดที่ต้องสั่งผลิตเพิ่ม
          </p>
        </div>
        {ready && ready.products.length > 0 && (
          <button
            type="button"
            onClick={() => downloadCsv(ready.products, ready.tally.ordered)}
            className={`${secondaryButtonClass} ${focusRing} whitespace-nowrap`}
          >
            ส่งออกไฟล์ CSV
          </button>
        )}
      </div>

      {error !== null && <ApiErrorView error={error} onRetry={retry} />}

      {error === null && !ready && (
        <div aria-busy="true" aria-live="polite" className="space-y-4 p-6">
          <span className="sr-only">กำลังโหลดข้อมูล...</span>
          <SkeletonBar className="h-7 w-1/2" />
          <SkeletonBar className="h-5 w-2/3" />
          <SkeletonBar className="h-24" />
        </div>
      )}

      {error === null && ready && ready.products.length === 0 && (
        <EmptyState
          icon={<EventIcon className="h-10 w-10" aria-hidden="true" />}
          title="ยังไม่มีสินค้าพรีออเดอร์"
          description="เปิดรับพรีออเดอร์ได้โดยเลือก “เป็นสินค้าพรีออเดอร์” ในหน้าแก้ไขสินค้า แล้วกำหนดวันปิดรับ"
          action={
            <Link href="/staff/products" className={`${secondaryButtonClass} ${focusRing}`}>
              ไปหน้าจัดการสินค้า
            </Link>
          }
        />
      )}

      {error === null && ready && ready.products.length > 0 && (
        <div>
          {ready.tally.countedOrders < ready.tally.totalOrders && (
            <div className="px-6 pt-6">
              <Alert tone="info">
                นับยอดสั่งจากคำสั่งซื้อ {formatNumber(ready.tally.countedOrders)} รายการแรก จากทั้งหมด{" "}
                {formatNumber(ready.tally.totalOrders)} รายการ
              </Alert>
            </div>
          )}
          <ul className="divide-y divide-outline-variant/40">
            {ready.products.map((product) => (
              <PreorderProductBlock key={product.id} product={product} ordered={ready.tally.ordered} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function PreorderProductBlock({ product, ordered }: { product: Product; ordered: Map<string, number> }) {
  const rows = rowsOf(product, ordered);
  const totals = rows.reduce(
    (sum, r) => ({ ordered: sum.ordered + r.ordered, stock: sum.stock + r.stock, backlog: sum.backlog + r.backlog }),
    { ordered: 0, stock: 0, backlog: 0 },
  );
  const windowStatus = preorderWindow(product);

  return (
    <li className="space-y-4 p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h3 className="text-body-lg font-semibold text-on-surface">{product.name}</h3>
          <p className="text-body-md text-secondary">
            ปิดรับ {formatDate(product.preorderEndDate)} · คาดว่าได้รับสินค้า {formatDate(product.estimatedDelivery)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={windowStatus.tone} label={windowStatus.label} />
          {totals.backlog > 0 && <StatusBadge tone="warning" label={`ค้างผลิต ${formatNumber(totals.backlog)} ชิ้น`} />}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-4">
        {[
          { label: "สั่งแล้ว", value: totals.ordered },
          { label: "คงเหลือ", value: totals.stock },
          { label: "ต้องผลิตเพิ่ม", value: totals.backlog },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg bg-surface px-4 py-3">
            <dt className="text-label-md text-on-surface-variant">{stat.label}</dt>
            <dd className="font-display text-headline-md text-primary-container tabular-nums">
              {formatNumber(stat.value)}
            </dd>
          </div>
        ))}
      </dl>

      {rows.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">
          สินค้านี้ยังไม่มีตัวเลือก ลูกค้าจึงยังสั่งพรีออเดอร์ไม่ได้
        </p>
      ) : (
        <div className="relative overflow-x-auto rounded-lg border border-outline-variant/40">
          <table className="w-full min-w-lg border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant/40 bg-surface text-label-md text-on-surface-variant">
                <th scope="col" className={thClass}>
                  ตัวเลือก
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  สั่งแล้ว (ชิ้น)
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  คงเหลือ (ชิ้น)
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  ต้องผลิตเพิ่ม (ชิ้น)
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-outline-variant/40 text-body-md last:border-0">
                  <td className={`${tdClass} font-medium text-on-surface`}>{r.name}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatNumber(r.ordered)}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatNumber(r.stock)}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    {r.backlog > 0 ? (
                      <span className="font-semibold text-amber-800">{formatNumber(r.backlog)}</span>
                    ) : (
                      <span className="text-on-surface-variant">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </li>
  );
}
