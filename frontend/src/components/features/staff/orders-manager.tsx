"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ConfirmDeleteModal,
  DeleteIcon,
  EditIcon,
  ReceiptIcon,
  SearchIcon,
  StatusBadge,
  cardClass,
  iconButtonClass,
  iconDangerButtonClass,
  inputClass,
  secondaryButtonClass,
  tdClass,
  thClass,
} from "@/csmju";
import { ApiErrorView, errorMessage } from "@/components/shared/api-error-view";
import { FormField } from "@/components/shared/form-field";
import { Pagination } from "@/components/shared/pagination";
import { useMe } from "@/components/shared/session-context";
import { LocalShippingIcon, OpenInNewIcon, ShoppingBagIcon } from "@/components/shared/shop-icons";
import { Alert, EmptyState, TableSkeleton } from "@/components/shared/states";
import { useToast } from "@/components/shared/toast";
import { api, type Page } from "@/lib/api";
import { carrierLabel, trackingUrl } from "@/lib/carriers";
import { formatDateTime, formatMoney, formatPhone } from "@/lib/format";
import { PERMISSION, can } from "@/lib/permissions";
import {
  DELIVERY_METHOD_LABEL,
  ORDER_STATUS,
  ORDER_STATUSES,
  PAYMENT_STATUS,
  PAYMENT_STATUSES,
} from "@/lib/status";
import type { DeliveryMethod, Order, OrderStatus, PaymentStatus } from "@/lib/types";
import {
  OrdersItemsModal,
  OrdersPaymentModal,
  OrdersShippingModal,
  OrdersStatusModal,
  slipHref,
} from "./orders-modals";
import { focusRing, tonalButtonClass } from "./orders-ui";

const PAGE_SIZE = 20;

export interface OrdersFilters {
  search: string;
  orderStatus: OrderStatus | "";
  paymentStatus: PaymentStatus | "";
  deliveryMethod: DeliveryMethod | "";
}

export const EMPTY_FILTERS: OrdersFilters = { search: "", orderStatus: "", paymentStatus: "", deliveryMethod: "" };

type State = { status: "loading" } | { status: "error"; error: unknown } | { status: "ready"; data: Page<Order> };
type Dialog = { kind: "items" | "payment" | "status" | "shipping" | "delete"; order: Order };

/** ตรวจ/บันทึกการชำระเงินได้ไหม (ยังไม่ชำระ ยังไม่คืนเงิน และไม่ถูกยกเลิก) */
function canReviewPayment(order: Order): boolean {
  return (
    order.orderStatus !== "CANCELLED" && order.paymentStatus !== "PAID" && order.paymentStatus !== "REFUNDED"
  );
}

function hasFilters(f: OrdersFilters): boolean {
  return Boolean(f.search || f.orderStatus || f.paymentStatus || f.deliveryMethod);
}

/** เก็บตัวกรองไว้ใน URL — กดรีเฟรชหรือแชร์ลิงก์แล้วได้มุมมองเดิม */
function syncUrl(filters: OrdersFilters, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
}

export function OrdersManager({ initialFilters, initialPage }: { initialFilters: OrdersFilters; initialPage: number }) {
  const me = useMe();
  const toast = useToast();
  const canUpdate = can(me?.permissions, PERMISSION.ORDER_UPDATE_ANY);
  const canDelete = can(me?.permissions, PERMISSION.ORDER_DELETE_ANY);

  const [filters, setFilters] = useState<OrdersFilters>(initialFilters);
  const [searchInput, setSearchInput] = useState(initialFilters.search);
  const [page, setPage] = useState(initialPage);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<State>({ status: "loading" });
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    syncUrl(filters, page);
    api
      .listOrders({
        page,
        limit: PAGE_SIZE,
        search: filters.search || undefined,
        orderStatus: filters.orderStatus || undefined,
        paymentStatus: filters.paymentStatus || undefined,
        deliveryMethod: filters.deliveryMethod || undefined,
      })
      .then((data) => {
        if (cancelled) return;
        // หน้าปัจจุบันว่างเพราะข้อมูลลดลง (เช่น เพิ่งลบแถวสุดท้าย) → ถอยไปหน้าสุดท้ายที่มีข้อมูล
        if (data.items.length === 0 && page > 1 && data.meta.totalPages > 0) {
          setPage(Math.min(page - 1, data.meta.totalPages));
          return;
        }
        setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: "error", error });
      });
    return () => {
      cancelled = true;
    };
  }, [filters, page, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const applyFilters = (next: OrdersFilters) => {
    setActionError(null);
    setFilters(next);
    setPage(1);
  };

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    applyFilters({ ...filters, search: searchInput.trim() });
  };

  const clearFilters = () => {
    setSearchInput("");
    applyFilters(EMPTY_FILTERS);
  };

  /** ผลของ PATCH คืนคำสั่งซื้อฉบับใหม่มาแล้ว — แทนแถวเดิมโดยไม่ต้องโหลดทั้งตารางใหม่ */
  const replaceOrder = (updated: Order) => {
    setState((s) =>
      s.status === "ready"
        ? { ...s, data: { ...s.data, items: s.data.items.map((o) => (o.id === updated.id ? updated : o)) } }
        : s,
    );
    setDialog(null);
  };

  const confirmDelete = async (order: Order) => {
    setDialog(null);
    setActionError(null);
    setDeletingId(order.id);
    try {
      await api.deleteOrder(order.id);
      toast(`ลบคำสั่งซื้อ ${order.orderNumber} แล้ว`);
      reload();
    } catch (e) {
      setActionError(`ลบคำสั่งซื้อ ${order.orderNumber} ไม่สำเร็จ: ${errorMessage(e)}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = hasFilters(filters);

  return (
    <div className={cardClass}>
      <form onSubmit={onSearch} className="space-y-4 border-b border-outline-variant/40 px-6 py-5" role="search">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField id="orders-search" label="ค้นหา">
            <div className="relative">
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-outline"
              />
              <input
                id="orders-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="เลขที่ ชื่อผู้รับ อีเมล รหัสรับ หรือเลขพัสดุ"
                className={`${inputClass} pl-10`}
              />
            </div>
          </FormField>
          <FormField id="orders-order-status" label="สถานะคำสั่งซื้อ">
            <select
              id="orders-order-status"
              value={filters.orderStatus}
              onChange={(e) => applyFilters({ ...filters, orderStatus: e.target.value as OrdersFilters["orderStatus"] })}
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
          <FormField id="orders-payment-status" label="การชำระเงิน">
            <select
              id="orders-payment-status"
              value={filters.paymentStatus}
              onChange={(e) =>
                applyFilters({ ...filters, paymentStatus: e.target.value as OrdersFilters["paymentStatus"] })
              }
              className={inputClass}
            >
              <option value="">ทุกสถานะ</option>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PAYMENT_STATUS[s].label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="orders-delivery-method" label="การรับสินค้า">
            <select
              id="orders-delivery-method"
              value={filters.deliveryMethod}
              onChange={(e) =>
                applyFilters({ ...filters, deliveryMethod: e.target.value as OrdersFilters["deliveryMethod"] })
              }
              className={inputClass}
            >
              <option value="">ทุกวิธี</option>
              {(Object.keys(DELIVERY_METHOD_LABEL) as DeliveryMethod[]).map((m) => (
                <option key={m} value={m}>
                  {DELIVERY_METHOD_LABEL[m]}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          {(filtered || searchInput) && (
            <button type="button" onClick={clearFilters} className={`${secondaryButtonClass} ${focusRing}`}>
              ล้างตัวกรอง
            </button>
          )}
          <button type="submit" className={`${secondaryButtonClass} ${focusRing} flex items-center gap-2`}>
            <SearchIcon className="h-4 w-4" />
            ค้นหา
          </button>
        </div>
      </form>

      {actionError && (
        <div className="border-b border-outline-variant/40 px-6 py-4">
          <Alert>{actionError}</Alert>
        </div>
      )}

      {state.status === "loading" && <TableSkeleton rows={8} />}
      {state.status === "error" && <ApiErrorView error={state.error} onRetry={reload} />}
      {state.status === "ready" &&
        (state.data.items.length === 0 ? (
          filtered ? (
            <EmptyState
              title="ไม่พบคำสั่งซื้อที่ตรงกับการค้นหา"
              description="ลองเปลี่ยนคำค้นหาหรือตัวกรอง แล้วค้นหาอีกครั้ง"
              icon={<SearchIcon className="h-10 w-10" />}
              action={
                <button type="button" onClick={clearFilters} className={`${secondaryButtonClass} ${focusRing}`}>
                  ล้างตัวกรอง
                </button>
              }
            />
          ) : (
            <EmptyState
              title="ยังไม่มีคำสั่งซื้อ"
              description="เมื่อลูกค้าสั่งซื้อสินค้า รายการจะแสดงที่นี่ให้ตรวจสลิปและอัปเดตสถานะ"
              icon={<ShoppingBagIcon className="h-10 w-10" />}
              action={
                <Link href="/" className={`${secondaryButtonClass} ${focusRing}`}>
                  ไปหน้าร้านค้า
                </Link>
              }
            />
          )
        ) : (
          <>
            <div className="relative overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">รายการคำสั่งซื้อทั้งหมด</caption>
                <thead>
                  <tr className="border-b border-outline-variant/40 bg-surface text-label-md text-on-surface-variant">
                    <th scope="col" className={thClass}>
                      เลขที่คำสั่งซื้อ
                    </th>
                    <th scope="col" className={thClass}>
                      ผู้สั่งซื้อ
                    </th>
                    <th scope="col" className={`${thClass} text-right`}>
                      ยอดรวม
                    </th>
                    <th scope="col" className={thClass}>
                      การรับสินค้า
                    </th>
                    <th scope="col" className={thClass}>
                      การชำระเงิน
                    </th>
                    <th scope="col" className={thClass}>
                      สถานะ
                    </th>
                    <th scope="col" className={`${thClass} text-right`}>
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.items.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      canUpdate={canUpdate}
                      canDelete={canDelete}
                      deleting={deletingId === order.id}
                      onOpen={(kind) => {
                        setActionError(null);
                        setDialog({ kind, order });
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={state.data.meta} onPage={setPage} />
          </>
        ))}

      {dialog?.kind === "items" && <OrdersItemsModal order={dialog.order} onClose={() => setDialog(null)} />}
      {dialog?.kind === "payment" && (
        <OrdersPaymentModal order={dialog.order} onClose={() => setDialog(null)} onSaved={replaceOrder} />
      )}
      {dialog?.kind === "status" && (
        <OrdersStatusModal order={dialog.order} onClose={() => setDialog(null)} onSaved={replaceOrder} />
      )}
      {dialog?.kind === "shipping" && (
        <OrdersShippingModal order={dialog.order} onClose={() => setDialog(null)} onSaved={replaceOrder} />
      )}
      {dialog?.kind === "delete" && (
        <ConfirmDeleteModal
          title={`ลบคำสั่งซื้อ ${dialog.order.orderNumber}?`}
          message={<DeleteMessage order={dialog.order} />}
          onConfirm={() => confirmDelete(dialog.order)}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

function DeleteMessage({ order }: { order: Order }) {
  const stock =
    order.orderStatus === "COMPLETED"
      ? "สินค้าส่งมอบไปแล้ว ระบบจะไม่คืนสต็อก"
      : order.orderStatus === "CANCELLED"
        ? "สต็อกถูกคืนไปแล้วตอนยกเลิก ระบบจะไม่คืนซ้ำ"
        : "ระบบจะคืนสต็อกสินค้าทุกรายการในคำสั่งซื้อนี้";
  return (
    <>
      คำสั่งซื้อ <strong className="text-on-surface">{order.orderNumber}</strong> ของ {order.recipientName}{" "}
      จะถูกลบถาวร พร้อมรายการสินค้าและประวัติการรับสินค้า {stock} และย้อนกลับไม่ได้
    </>
  );
}

function OrderRow({
  order,
  canUpdate,
  canDelete,
  deleting,
  onOpen,
}: {
  order: Order;
  canUpdate: boolean;
  canDelete: boolean;
  deleting: boolean;
  onOpen: (kind: Dialog["kind"]) => void;
}) {
  const isDelivery = order.deliveryMethod === "DELIVERY";
  const slip = slipHref(order.paymentSlip);
  const trackHref = trackingUrl(order.shippingCarrier, order.trackingNumber);

  return (
    <tr
      aria-busy={deleting || undefined}
      className={`border-b border-outline-variant/40 text-body-md transition-colors last:border-0 hover:bg-surface/50 ${
        deleting ? "opacity-40" : ""
      }`}
    >
      <td className={`${tdClass} whitespace-nowrap`}>
        <p className="font-medium text-on-surface tabular-nums">{order.orderNumber}</p>
        <p className="text-label-sm text-secondary tabular-nums">{formatDateTime(order.createdAt)}</p>
      </td>
      <td className={tdClass}>
        <p className="text-on-surface">{order.recipientName}</p>
        <p className="text-on-surface-variant">{order.customerEmail}</p>
        <p className="text-on-surface-variant tabular-nums">{formatPhone(order.recipientPhone)}</p>
      </td>
      <td className={`${tdClass} whitespace-nowrap text-right text-on-surface tabular-nums`}>
        {formatMoney(order.totalAmount)}
      </td>
      <td className={`${tdClass} whitespace-nowrap`}>
        <p className="text-on-surface">{DELIVERY_METHOD_LABEL[order.deliveryMethod]}</p>
        {isDelivery ? (
          order.trackingNumber ? (
            <p className="text-on-surface-variant">
              {carrierLabel(order.shippingCarrier)} ·{" "}
              {trackHref ? (
                <a
                  href={trackHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 rounded text-primary-container tabular-nums hover:underline ${focusRing}`}
                >
                  {order.trackingNumber}
                  <OpenInNewIcon className="h-4 w-4" />
                  <span className="sr-only">(เปิดหน้าเช็คพัสดุในแท็บใหม่)</span>
                </a>
              ) : (
                <span className="tabular-nums">{order.trackingNumber}</span>
              )}
            </p>
          ) : (
            order.orderStatus !== "CANCELLED" && <p className="text-label-md text-amber-800">ยังไม่มีเลขพัสดุ</p>
          )
        ) : (
          order.pickupCode && (
            <p className="text-on-surface-variant tabular-nums">รหัสรับ {order.pickupCode}</p>
          )
        )}
      </td>
      <td className={`${tdClass} whitespace-nowrap`}>
        <div className="flex flex-col items-start gap-2">
          <StatusBadge {...PAYMENT_STATUS[order.paymentStatus]} />
          {slip && (
            <a
              href={slip}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`เปิดดูสลิปของ ${order.orderNumber} ในแท็บใหม่`}
              className={`inline-flex items-center gap-1 rounded text-label-md text-primary-container hover:underline ${focusRing}`}
            >
              ดูสลิป
              <OpenInNewIcon className="h-4 w-4" />
            </a>
          )}
          {canUpdate && canReviewPayment(order) && (
            <button
              type="button"
              onClick={() => onOpen("payment")}
              disabled={deleting}
              aria-label={`ตรวจการชำระเงินของ ${order.orderNumber}`}
              className={tonalButtonClass}
            >
              {order.paymentStatus === "WAITING_VERIFY" ? "ตรวจสลิป" : "ตรวจการชำระเงิน"}
            </button>
          )}
        </div>
      </td>
      <td className={`${tdClass} whitespace-nowrap`}>
        <StatusBadge {...ORDER_STATUS[order.orderStatus]} />
      </td>
      <td className={`${tdClass} whitespace-nowrap text-right`}>
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onOpen("items")}
            aria-label={`ดูรายละเอียดสินค้าของ ${order.orderNumber}`}
            title="ดูรายละเอียด"
            className={`${iconButtonClass} rounded-lg ${focusRing}`}
          >
            <ReceiptIcon className="h-5 w-5" />
          </button>
          {canUpdate && (
            <button
              type="button"
              onClick={() => onOpen("status")}
              disabled={deleting}
              aria-label={`แก้ไขสถานะของ ${order.orderNumber}`}
              title="แก้ไขสถานะ"
              className={`${iconButtonClass} rounded-lg ${focusRing}`}
            >
              <EditIcon className="h-5 w-5" />
            </button>
          )}
          {canUpdate && isDelivery && (
            <button
              type="button"
              onClick={() => onOpen("shipping")}
              disabled={deleting}
              aria-label={`แก้ไขข้อมูลการจัดส่งของ ${order.orderNumber}`}
              title="ข้อมูลการจัดส่ง"
              className={`${iconButtonClass} rounded-lg ${focusRing}`}
            >
              <LocalShippingIcon className="h-5 w-5" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => onOpen("delete")}
              disabled={deleting}
              aria-label={`ลบ ${order.orderNumber}`}
              title="ลบ"
              className={`${iconDangerButtonClass} rounded-lg ${focusRing}`}
            >
              <DeleteIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
