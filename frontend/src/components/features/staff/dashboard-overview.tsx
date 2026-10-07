"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowForwardIcon,
  DescriptionIcon,
  ReceiptIcon,
  StatusBadge,
  TrendingUpIcon,
  cardClass,
  secondaryButtonClass,
  tdClass,
  thClass,
  type StatusTone,
} from "@/csmju";
import { ApiErrorView } from "@/components/shared/api-error-view";
import { useMe } from "@/components/shared/session-context";
import { StorefrontIcon } from "@/components/shared/shop-icons";
import { EmptyState } from "@/components/shared/states";
import { api, type Page } from "@/lib/api";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { PERMISSION, can } from "@/lib/permissions";
import { ORDER_STATUS, ORDER_STATUSES, PAYMENT_STATUS, PAYMENT_STATUSES } from "@/lib/status";
import type { Order, OrderStats } from "@/lib/types";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { DashboardStatCard } from "./dashboard-stat-card";
import { CardHeader, focusRing, linkClass } from "./orders-ui";

type Loaded = { stats: OrderStats | null; waiting: Page<Order> };
type State = { status: "loading" } | { status: "error"; error: unknown } | { status: "ready"; data: Loaded };

const WAITING_LIMIT = 5;
const WAITING_HREF = "/staff/orders?paymentStatus=WAITING_VERIFY";

function countOf(list: OrderStats["byOrderStatus"], status: string): number {
  return list.find((s) => s.status === status)?.count ?? 0;
}

/** "1,234.00 บาท" → ["1,234.00", "บาท"] เพื่อแยกหน่วยไทยออกจากตัวเลขขนาดใหญ่ */
function splitMoney(satang: number): [string, string] {
  const text = formatMoney(satang);
  const at = text.lastIndexOf(" ");
  return at > 0 ? [text.slice(0, at), text.slice(at + 1)] : [text, ""];
}

export function DashboardOverview() {
  const me = useMe();
  const canReport = can(me?.permissions, PERMISSION.REPORT_READ);
  const [state, setState] = useState<State>({ status: "loading" });

  const load = useCallback(() => {
    setState({ status: "loading" });
    Promise.all([
      canReport ? api.orderStats() : Promise.resolve(null),
      api.listOrders({ paymentStatus: "WAITING_VERIFY", limit: WAITING_LIMIT }),
    ])
      .then(([stats, waiting]) => setState({ status: "ready", data: { stats, waiting } }))
      .catch((error: unknown) => setState({ status: "error", error }));
  }, [canReport]);

  useEffect(load, [load]);

  if (state.status === "loading") return <DashboardSkeleton />;
  if (state.status === "error") {
    return (
      <div className={cardClass}>
        <ApiErrorView error={state.error} onRetry={load} />
      </div>
    );
  }

  const { stats, waiting } = state.data;

  return (
    <div className="space-y-8">
      {stats && <StatsSection stats={stats} />}
      <WaitingSection waiting={waiting} />
    </div>
  );
}

function StatsSection({ stats }: { stats: OrderStats }) {
  const [amount, unit] = splitMoney(stats.paidRevenue);
  return (
    <>
      <section aria-label="ตัวเลขสรุป" className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="คำสั่งซื้อทั้งหมด"
          value={formatNumber(stats.totalOrders)}
          unit="รายการ"
          hint="ทุกสถานะ"
          icon={<ReceiptIcon className="h-6 w-6" />}
        />
        <DashboardStatCard
          label="ยอดขายที่ชำระแล้ว"
          value={amount}
          unit={unit}
          hint="เฉพาะคำสั่งซื้อที่ชำระเงินแล้ว"
          icon={<TrendingUpIcon className="h-6 w-6" />}
          highlight
          compact
        />
        <DashboardStatCard
          label={PAYMENT_STATUS.WAITING_VERIFY.label}
          value={formatNumber(countOf(stats.byPaymentStatus, "WAITING_VERIFY"))}
          unit="รายการ"
          hint="ลูกค้าแนบสลิปแล้ว รอเจ้าหน้าที่ตรวจ"
          icon={<DescriptionIcon className="h-6 w-6" />}
        />
        <DashboardStatCard
          label={ORDER_STATUS.READY_FOR_PICKUP.label}
          value={formatNumber(countOf(stats.byOrderStatus, "READY_FOR_PICKUP"))}
          unit="รายการ"
          hint="รอลูกค้ามารับที่สาขา"
          icon={<StorefrontIcon className="h-6 w-6" />}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section aria-labelledby="by-order-status" className={cardClass}>
          <CardHeader id="by-order-status" title="คำสั่งซื้อตามสถานะ" />
          <ul>
            {ORDER_STATUSES.map((status) => (
              <StatusRow
                key={status}
                href={`/staff/orders?orderStatus=${status}`}
                tone={ORDER_STATUS[status].tone}
                label={ORDER_STATUS[status].label}
                count={countOf(stats.byOrderStatus, status)}
              />
            ))}
          </ul>
        </section>
        <section aria-labelledby="by-payment-status" className={cardClass}>
          <CardHeader id="by-payment-status" title="การชำระเงินตามสถานะ" />
          <ul>
            {PAYMENT_STATUSES.map((status) => (
              <StatusRow
                key={status}
                href={`/staff/orders?paymentStatus=${status}`}
                tone={PAYMENT_STATUS[status].tone}
                label={PAYMENT_STATUS[status].label}
                count={countOf(stats.byPaymentStatus, status)}
              />
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function StatusRow({
  href,
  tone,
  label,
  count,
}: {
  href: string;
  tone: StatusTone;
  label: string;
  count: number;
}) {
  return (
    <li className="border-b border-outline-variant/40 last:border-0">
      <Link
        href={href}
        className={`flex items-center justify-between gap-3 px-6 py-3 transition-colors hover:bg-surface/50 ${focusRing}`}
      >
        <StatusBadge tone={tone} label={label} />
        <span className="flex items-center gap-2 text-body-md text-on-surface tabular-nums">
          {formatNumber(count)}
          <span className="sr-only">รายการ ดูคำสั่งซื้อสถานะนี้</span>
          <ArrowForwardIcon className="h-4 w-4 text-outline" />
        </span>
      </Link>
    </li>
  );
}

function WaitingSection({ waiting }: { waiting: Page<Order> }) {
  return (
    <section aria-labelledby="waiting-verify" className={cardClass}>
      <CardHeader
        id="waiting-verify"
        title="สลิปที่รอตรวจ"
        action={
          waiting.meta.total > 0 ? (
            <Link href={WAITING_HREF} className={linkClass}>
              ดูทั้งหมด <span className="tabular-nums">({formatNumber(waiting.meta.total)})</span>
            </Link>
          ) : undefined
        }
      />
      {waiting.items.length === 0 ? (
        <EmptyState
          title="ไม่มีสลิปที่รอตรวจ"
          description="คำสั่งซื้อที่ลูกค้าแนบสลิปแล้วจะแสดงที่นี่ เพื่อให้เจ้าหน้าที่ตรวจและอนุมัติการชำระเงิน"
          icon={<DescriptionIcon className="h-10 w-10" />}
          action={
            <Link href="/staff/orders" className={`${secondaryButtonClass} ${focusRing}`}>
              ดูคำสั่งซื้อทั้งหมด
            </Link>
          }
        />
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full border-collapse text-left">
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
                  วันที่สั่ง
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody>
              {waiting.items.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-outline-variant/40 text-body-md transition-colors last:border-0 hover:bg-surface/50"
                >
                  <td className={`${tdClass} whitespace-nowrap font-medium text-on-surface tabular-nums`}>
                    {order.orderNumber}
                  </td>
                  <td className={tdClass}>
                    <p className="text-on-surface">{order.recipientName}</p>
                    <p className="text-on-surface-variant">{order.customerEmail}</p>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-right text-on-surface tabular-nums`}>
                    {formatMoney(order.totalAmount)}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-on-surface-variant tabular-nums`}>
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-right`}>
                    <Link
                      href={`/staff/orders?paymentStatus=WAITING_VERIFY&search=${encodeURIComponent(order.orderNumber)}`}
                      className={linkClass}
                      aria-label={`ตรวจสลิปของ ${order.orderNumber}`}
                    >
                      ตรวจสลิป
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
