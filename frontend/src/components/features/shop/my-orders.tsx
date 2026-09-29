"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  PageHeader,
  ReceiptIcon,
  SearchIcon,
  StatusBadge,
  cardClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  tdClass,
  thClass,
} from "@/csmju";
import { ApiErrorView } from "@/components/shared/api-error-view";
import { FormField } from "@/components/shared/form-field";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/states";
import type { Page } from "@/lib/api";
import { api } from "@/lib/api";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { DELIVERY_METHOD_LABEL, ORDER_STATUS, ORDER_STATUSES, PAYMENT_STATUS } from "@/lib/status";
import type { Order, OrderStatus } from "@/lib/types";
import { focusRing, linkClass } from "./shop-ui";
import { TableRowsSkeleton } from "./skeletons";

const PAGE_SIZE = 20;

type LoadState =
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | { status: "ready"; page: Page<Order> };

export function MyOrders() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState<OrderStatus | "">("");
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    api
      .listOrders({
        mine: true,
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        orderStatus: orderStatus || undefined,
      })
      .then((result) => active && setState({ status: "ready", page: result }))
      .catch((error: unknown) => active && setState({ status: "error", error }));
    return () => {
      active = false;
    };
  }, [page, search, orderStatus, reloadKey]);

  const filtered = search !== "" || orderStatus !== "";
  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setOrderStatus("");
    setPage(1);
  };

  return (
    <div className="space-y-8">
      <PageHeader title="คำสั่งซื้อของฉัน" description="ติดตามสถานะการชำระเงิน การรับสินค้า และการจัดส่งของคำสั่งซื้อทั้งหมด" />

      <section className={cardClass} aria-label="รายการคำสั่งซื้อ">
        <form
          role="search"
          className="flex flex-col gap-3 border-b border-outline-variant/40 px-6 py-5 md:flex-row md:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput.trim());
            setPage(1);
          }}
        >
          <div className="flex-1">
            <FormField id="order-search" label="ค้นหาคำสั่งซื้อ">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-outline" />
                <input
                  id="order-search"
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="เลขที่คำสั่งซื้อ รหัสรับสินค้า หรือเลขพัสดุ"
                  maxLength={100}
                  className={`${inputClass} pl-10`}
                />
              </div>
            </FormField>
          </div>
          <div className="md:w-48">
            <FormField id="order-status-filter" label="สถานะคำสั่งซื้อ">
              <select
                id="order-status-filter"
                value={orderStatus}
                onChange={(e) => {
                  setOrderStatus(e.target.value as OrderStatus | "");
                  setPage(1);
                }}
                className={inputClass}
              >
                <option value="">ทุกสถานะ</option>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS[s].label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          {filtered && (
            <button type="button" onClick={clearFilters} className={`${secondaryButtonClass} min-h-11 md:min-h-0 ${focusRing}`}>
              ล้างตัวกรอง
            </button>
          )}
        </form>

        {state.status === "loading" && (
          <div aria-busy="true" aria-live="polite">
            <span className="sr-only">กำลังโหลดข้อมูล...</span>
            <TableRowsSkeleton />
          </div>
        )}

        {state.status === "error" && (
          <ApiErrorView error={state.error} onRetry={() => setReloadKey((k) => k + 1)} />
        )}

        {state.status === "ready" && state.page.items.length === 0 && (
          filtered ? (
            <EmptyState
              icon={<SearchIcon className="h-10 w-10" />}
              title="ไม่พบคำสั่งซื้อที่ตรงกับการค้นหา"
              description="ลองเปลี่ยนคำค้นหรือสถานะที่เลือก แล้วค้นหาอีกครั้ง"
              action={
                <button type="button" onClick={clearFilters} className={`${secondaryButtonClass} ${focusRing}`}>
                  ล้างตัวกรอง
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={<ReceiptIcon className="h-10 w-10" />}
              title="ยังไม่มีคำสั่งซื้อ"
              description="เมื่อคุณสั่งซื้อสินค้าจากร้านค้า คำสั่งซื้อจะแสดงที่นี่"
              action={
                <Link href="/" className={`${primaryButtonClass} ${focusRing}`}>
                  ไปเลือกสินค้า
                </Link>
              }
            />
          )
        )}

        {state.status === "ready" && state.page.items.length > 0 && (
          <>
            <div className="relative overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">
                  คำสั่งซื้อของฉัน ทั้งหมด {formatNumber(state.page.meta.total)} รายการ
                </caption>
                <thead>
                  <tr className="border-b border-outline-variant/40 bg-surface text-label-md text-on-surface-variant">
                    <th scope="col" className={thClass}>เลขที่คำสั่งซื้อ</th>
                    <th scope="col" className={thClass}>วันที่สั่งซื้อ</th>
                    <th scope="col" className={thClass}>วิธีรับสินค้า</th>
                    <th scope="col" className={`${thClass} text-right`}>ยอดรวม</th>
                    <th scope="col" className={thClass}>การชำระเงิน</th>
                    <th scope="col" className={thClass}>สถานะ</th>
                    <th scope="col" className={`${thClass} text-right`}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {state.page.items.map((order) => {
                    const payment = PAYMENT_STATUS[order.paymentStatus];
                    const status = ORDER_STATUS[order.orderStatus];
                    return (
                      <tr
                        key={order.id}
                        className="border-b border-outline-variant/40 text-body-md transition-colors last:border-0 hover:bg-surface/50"
                      >
                        <td className={`${tdClass} font-medium whitespace-nowrap text-on-surface tabular-nums`}>
                          {order.orderNumber}
                        </td>
                        <td className={`${tdClass} whitespace-nowrap text-on-surface-variant tabular-nums`}>
                          {formatDateTime(order.createdAt)}
                        </td>
                        <td className={`${tdClass} whitespace-nowrap text-on-surface-variant`}>
                          {DELIVERY_METHOD_LABEL[order.deliveryMethod]}
                        </td>
                        <td className={`${tdClass} text-right whitespace-nowrap text-on-surface tabular-nums`}>
                          {formatMoney(order.totalAmount)}
                        </td>
                        <td className={tdClass}>
                          <StatusBadge tone={payment.tone} label={payment.label} />
                        </td>
                        <td className={tdClass}>
                          <StatusBadge tone={status.tone} label={status.label} />
                        </td>
                        <td className={`${tdClass} text-right whitespace-nowrap`}>
                          <Link href={`/orders/${order.id}`} className={linkClass}>
                            ดูรายละเอียด
                            <span className="sr-only"> คำสั่งซื้อ {order.orderNumber}</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination meta={state.page.meta} onPage={setPage} />
          </>
        )}
      </section>
    </div>
  );
}
