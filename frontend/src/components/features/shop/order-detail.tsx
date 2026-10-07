"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowBackIcon, PageHeader, StatusBadge, cardClass, secondaryButtonClass, tdClass, thClass } from "@/csmju";
import { ApiErrorView, errorMessage } from "@/components/shared/api-error-view";
import { RefreshIcon } from "@/components/shared/shop-icons";
import { Alert } from "@/components/shared/states";
import { ApiError, api } from "@/lib/api";
import { formatDateTime, formatMoney, formatNumber, formatPhone } from "@/lib/format";
import { DELIVERY_METHOD_LABEL, ORDER_STATUS, PAYMENT_STATUS } from "@/lib/status";
import type { Order } from "@/lib/types";
import { PickupPass, ShippingPanel } from "./delivery-panels";
import { OrderNotFound } from "./order-not-found";
import { OrderTimeline } from "./order-timeline";
import { cardHeaderClass, cardTitleClass, focusRing, linkClass } from "./shop-ui";
import { OrderDetailSkeleton } from "./skeletons";
import { CurrentSlip, SlipForm } from "./slip-form";

type LoadState = { status: "loading" } | { status: "error"; error: unknown } | { status: "ready"; order: Order };

const PAYMENT_NOTE: Partial<Record<Order["paymentStatus"], string>> = {
  PENDING: "ยังไม่ได้รับหลักฐานการชำระเงิน โอนเงินตามยอดที่ต้องชำระแล้วแนบสลิปด้านล่าง",
  WAITING_VERIFY: "เจ้าหน้าที่กำลังตรวจสอบสลิปของคุณ",
  REJECTED: "สลิปไม่ผ่านการตรวจสอบ กรุณาแนบสลิปใหม่",
};

function ItemsTable({ order }: { order: Order }) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">รายการสินค้าในคำสั่งซื้อ {order.orderNumber}</caption>
        <thead>
          <tr className="border-b border-outline-variant/40 bg-surface text-label-md text-on-surface-variant">
            <th scope="col" className={thClass}>สินค้า</th>
            <th scope="col" className={thClass}>ตัวเลือก</th>
            <th scope="col" className={`${thClass} text-right`}>จำนวน</th>
            <th scope="col" className={`${thClass} text-right`}>ราคาต่อชิ้น</th>
            <th scope="col" className={`${thClass} text-right`}>รวม</th>
          </tr>
        </thead>
        <tbody>
          {order.orderItems.map((item) => (
            <tr key={item.id} className="border-b border-outline-variant/40 text-body-md last:border-0 hover:bg-surface/50">
              <td className={`${tdClass} font-medium text-on-surface`}>
                <span className="block">{item.variant.product.name}</span>
                {item.isPreorderItem && (
                  <span className="mt-1 inline-block">
                    <StatusBadge tone="info" label="พรีออเดอร์" />
                  </span>
                )}
              </td>
              <td className={`${tdClass} text-on-surface-variant`}>{item.variant.variantName}</td>
              <td className={`${tdClass} text-right text-on-surface tabular-nums`}>{formatNumber(item.quantity)}</td>
              <td className={`${tdClass} text-right whitespace-nowrap text-on-surface-variant tabular-nums`}>
                {formatMoney(item.unitPrice)}
              </td>
              <td className={`${tdClass} text-right whitespace-nowrap text-on-surface tabular-nums`}>
                {formatMoney(item.unitPrice * item.quantity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OrderDetail({ id }: { id: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    api
      .getOrder(id)
      .then((order) => active && setState({ status: "ready", order }))
      .catch((error: unknown) => active && setState({ status: "error", error }));
    return () => {
      active = false;
    };
  }, [id]);

  const reload = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const order = await api.getOrder(id);
      setState({ status: "ready", order });
    } catch (error) {
      if (!(error instanceof ApiError && error.code === "UNAUTHORIZED")) setRefreshError(errorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  const retry = () => {
    setState({ status: "loading" });
    api
      .getOrder(id)
      .then((order) => setState({ status: "ready", order }))
      .catch((error: unknown) => setState({ status: "error", error }));
  };

  if (state.status === "loading") return <OrderDetailSkeleton />;

  if (state.status === "error") {
    const code = state.error instanceof ApiError ? state.error.code : null;
    if (code === "NOT_FOUND" || code === "VALIDATION_ERROR") return <OrderNotFound />;
    return (
      <div className="space-y-8">
        <PageHeader title="รายละเอียดคำสั่งซื้อ" description="ข้อมูลคำสั่งซื้อ สถานะ และการรับสินค้า" />
        <div className={cardClass}>
          <ApiErrorView error={state.error} onRetry={retry} />
        </div>
      </div>
    );
  }

  const order = state.order;
  const isPickup = order.deliveryMethod === "PICKUP";
  const payment = PAYMENT_STATUS[order.paymentStatus];
  const status = ORDER_STATUS[order.orderStatus];
  const cancelled = order.orderStatus === "CANCELLED";
  const canAttachSlip = !cancelled && (order.paymentStatus === "PENDING" || order.paymentStatus === "REJECTED");
  const paymentNote = cancelled ? undefined : PAYMENT_NOTE[order.paymentStatus];
  const itemCount = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/orders" className={linkClass}>
          <ArrowBackIcon className="h-4 w-4" />
          กลับไปคำสั่งซื้อของฉัน
        </Link>
        <button
          type="button"
          onClick={reload}
          className={`${secondaryButtonClass} flex min-h-11 items-center gap-2 disabled:cursor-not-allowed md:min-h-0 ${focusRing}`}
          aria-busy={refreshing}
          disabled={refreshing}
        >
          <RefreshIcon className={`h-4 w-4 ${refreshing ? "motion-safe:animate-spin" : ""}`} />
          {refreshing ? "กำลังโหลดข้อมูล..." : "โหลดสถานะล่าสุด"}
        </button>
      </div>

      <PageHeader
        title={`คำสั่งซื้อ ${order.orderNumber}`}
        description={`สั่งซื้อเมื่อ ${formatDateTime(order.createdAt)} · ${DELIVERY_METHOD_LABEL[order.deliveryMethod]}`}
      />

      {refreshError && <Alert title="โหลดสถานะล่าสุดไม่สำเร็จ">{refreshError}</Alert>}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <section className={cardClass} aria-labelledby="order-status-title">
            <div className={`${cardHeaderClass} flex flex-wrap items-center justify-between gap-3`}>
              <h2 id="order-status-title" className={cardTitleClass}>
                สถานะคำสั่งซื้อ
              </h2>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={payment.tone} label={payment.label} />
                <StatusBadge tone={status.tone} label={status.label} />
              </div>
            </div>
            <div className="space-y-6 p-6">
              {cancelled ? (
                <Alert tone="warning" title="คำสั่งซื้อนี้ถูกยกเลิกแล้ว">
                  หากมีข้อสงสัยเรื่องการคืนเงิน กรุณาติดต่อเจ้าหน้าที่ร้านค้าของสาขา
                </Alert>
              ) : (
                <>
                  {paymentNote && <Alert tone="info">{paymentNote}</Alert>}
                  <OrderTimeline order={order} />
                </>
              )}
            </div>
          </section>

          <section className={cardClass} aria-labelledby="order-items-title">
            <div className={`${cardHeaderClass} flex items-center justify-between gap-3`}>
              <h2 id="order-items-title" className={cardTitleClass}>
                รายการสินค้า
              </h2>
              <span className="text-body-md text-on-surface-variant tabular-nums">
                {formatNumber(itemCount)} ชิ้น
              </span>
            </div>
            <ItemsTable order={order} />
            <dl className="space-y-2 border-t border-outline-variant/40 px-6 py-5 text-body-md">
              <div className="flex justify-between gap-3">
                <dt className="text-on-surface-variant">ราคาสินค้า</dt>
                <dd className="text-on-surface tabular-nums">{formatMoney(order.totalAmount - order.shippingFee)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-on-surface-variant">ค่าจัดส่ง</dt>
                <dd className="text-on-surface tabular-nums">{formatMoney(order.shippingFee)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-outline-variant/40 pt-2">
                <dt className="font-semibold text-on-surface">ยอดรวม</dt>
                <dd className="font-semibold text-primary-container tabular-nums">{formatMoney(order.totalAmount)}</dd>
              </div>
            </dl>
          </section>

          <section className={cardClass} aria-labelledby="order-recipient-title">
            <div className={cardHeaderClass}>
              <h2 id="order-recipient-title" className={cardTitleClass}>
                ข้อมูลผู้รับ
              </h2>
            </div>
            <dl className="grid grid-cols-1 gap-4 p-6 text-body-md md:grid-cols-2">
              <div>
                <dt className="text-label-md text-on-surface-variant">ชื่อผู้รับ</dt>
                <dd className="mt-1 text-on-surface">{order.recipientName}</dd>
              </div>
              <div>
                <dt className="text-label-md text-on-surface-variant">เบอร์โทรศัพท์</dt>
                <dd className="mt-1 text-on-surface tabular-nums">{formatPhone(order.recipientPhone)}</dd>
              </div>
              <div>
                <dt className="text-label-md text-on-surface-variant">อีเมลผู้สั่งซื้อ</dt>
                <dd className="mt-1 break-words text-on-surface" lang="en">
                  {order.customerEmail}
                </dd>
              </div>
              <div>
                <dt className="text-label-md text-on-surface-variant">วิธีรับสินค้า</dt>
                <dd className="mt-1 text-on-surface">{DELIVERY_METHOD_LABEL[order.deliveryMethod]}</dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="space-y-8">
          <section className={cardClass} aria-labelledby="order-delivery-title">
            <div className={cardHeaderClass}>
              <h2 id="order-delivery-title" className={cardTitleClass}>
                {isPickup ? "บัตรรับสินค้า" : "การจัดส่ง"}
              </h2>
            </div>
            {isPickup ? <PickupPass order={order} /> : <ShippingPanel order={order} />}
          </section>

          <section className={cardClass} aria-labelledby="order-slip-title">
            <div className={cardHeaderClass}>
              <h2 id="order-slip-title" className={cardTitleClass}>
                การชำระเงิน
              </h2>
            </div>
            <div className="space-y-4 p-6">
              <div className="space-y-2">
                <p className="text-label-md text-on-surface-variant">ยอดที่ต้องชำระ</p>
                <p className="font-display text-headline-md text-primary-container tabular-nums">
                  {formatMoney(order.totalAmount)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-label-md text-on-surface-variant">สลิปที่แนบไว้</p>
                <CurrentSlip slip={order.paymentSlip} />
              </div>
              {canAttachSlip && (
                <SlipForm order={order} onAttached={(updated) => setState({ status: "ready", order: updated })} />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
