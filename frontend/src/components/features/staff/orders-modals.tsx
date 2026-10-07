"use client";

import { useId, useState, type FormEvent } from "react";
import { Modal, StatusBadge, inputClass, secondaryButtonClass } from "@/csmju";
import { errorMessage } from "@/components/shared/api-error-view";
import { describedBy, FormField } from "@/components/shared/form-field";
import { OpenInNewIcon } from "@/components/shared/shop-icons";
import { Alert } from "@/components/shared/states";
import { useToast } from "@/components/shared/toast";
import { api } from "@/lib/api";
import { CARRIERS, carrierLabel, trackingUrl } from "@/lib/carriers";
import { formatDateTime, formatMoney, formatPhone } from "@/lib/format";
import { DELIVERY_METHOD_LABEL, ORDER_STATUS, ORDER_STATUSES, PAYMENT_STATUS } from "@/lib/status";
import type { Order, OrderStatus, PaymentStatus } from "@/lib/types";
import { OrdersItemList } from "./orders-item-list";
import { BusyButton, checkboxLabelClass, focusRing } from "./orders-ui";

const FINAL: OrderStatus[] = ["COMPLETED", "CANCELLED"];
const OTHER_CARRIER = "__other";
const cancelButtonClass = `${secondaryButtonClass} ${focusRing}`;

/** สลิปเป็น URL (http/https หรือ path ของเว็บเดียวกัน) เปิดดูได้ — ชื่อไฟล์เฉย ๆ แสดงเป็นข้อความ */
export function slipHref(slip: string | null): string | null {
  if (!slip) return null;
  const s = slip.trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  return null;
}

/** หัวสรุปคำสั่งซื้อที่อยู่บนสุดของทุก modal */
function OrderSummary({ order }: { order: Order }) {
  return (
    <div className="mb-4 space-y-1 rounded-lg bg-surface px-4 py-3">
      <p className="text-label-md text-on-surface tabular-nums">{order.orderNumber}</p>
      <p className="text-body-md text-on-surface-variant">
        {order.recipientName} · <span className="tabular-nums">{formatPhone(order.recipientPhone)}</span>
      </p>
      <p className="text-body-md text-on-surface-variant">{order.customerEmail}</p>
    </div>
  );
}

// ─────────────────────────── รายการสินค้า ───────────────────────────

export function OrdersItemsModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const subtotal = order.totalAmount - order.shippingFee;
  return (
    <Modal title="รายการสินค้า" onClose={onClose}>
      <OrderSummary order={order} />
      <div className="max-h-72 overflow-y-auto">
        <OrdersItemList items={order.orderItems} />
      </div>
      <dl className="mt-4 space-y-2 border-t border-outline-variant/40 pt-4 text-body-md">
        <div className="flex justify-between gap-3">
          <dt className="text-on-surface-variant">ค่าสินค้า</dt>
          <dd className="text-on-surface tabular-nums">{formatMoney(subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-on-surface-variant">ค่าจัดส่ง</dt>
          <dd className="text-on-surface tabular-nums">{formatMoney(order.shippingFee)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-on-surface">ยอดรวม</dt>
          <dd className="font-semibold text-on-surface tabular-nums">{formatMoney(order.totalAmount)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-on-surface-variant">การรับสินค้า</dt>
          <dd className="text-right text-on-surface">{DELIVERY_METHOD_LABEL[order.deliveryMethod]}</dd>
        </div>
        {order.deliveryMethod === "DELIVERY" && (
          <div className="space-y-1">
            <dt className="text-on-surface-variant">ที่อยู่จัดส่ง</dt>
            <dd className="text-on-surface">{order.shippingAddress || "—"}</dd>
          </div>
        )}
      </dl>
    </Modal>
  );
}

// ─────────────────────────── ตรวจสลิป ───────────────────────────

export function OrdersPaymentModal({
  order,
  onClose,
  onSaved,
}: {
  order: Order;
  onClose: () => void;
  onSaved: (order: Order) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const href = slipHref(order.paymentSlip);

  const save = async (paymentStatus: PaymentStatus) => {
    if (busy) return;
    setBusy(paymentStatus);
    setError(null);
    try {
      const updated = await api.setPaymentStatus(order.id, paymentStatus);
      toast(
        paymentStatus === "PAID"
          ? `${order.orderNumber} — อนุมัติการชำระเงินแล้ว`
          : `${order.orderNumber} — บันทึกว่าสลิปไม่ผ่านแล้ว`,
      );
      onSaved(updated);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal title="ตรวจการชำระเงิน" onClose={onClose}>
      <OrderSummary order={order} />
      <dl className="space-y-2 text-body-md">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-on-surface-variant">ยอดที่ต้องชำระ</dt>
          <dd className="font-semibold text-on-surface tabular-nums">{formatMoney(order.totalAmount)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-on-surface-variant">สถานะตอนนี้</dt>
          <dd>
            <StatusBadge {...PAYMENT_STATUS[order.paymentStatus]} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-on-surface-variant">สลิป</dt>
          <dd className="min-w-0 text-right">
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 rounded text-label-md text-primary-container hover:underline ${focusRing}`}
              >
                เปิดดูสลิป
                <OpenInNewIcon className="h-4 w-4" />
                <span className="sr-only">(เปิดในแท็บใหม่)</span>
              </a>
            ) : order.paymentSlip ? (
              <span className="break-words text-on-surface">{order.paymentSlip}</span>
            ) : (
              <span className="text-on-surface-variant">ยังไม่แนบ</span>
            )}
          </dd>
        </div>
      </dl>

      {!order.paymentSlip && (
        <div className="mt-4">
          <Alert tone="warning">
            ลูกค้ายังไม่แนบสลิป อนุมัติเฉพาะเมื่อได้รับเงินจริงแล้วเท่านั้น (เช่น ชำระเป็นเงินสดที่สาขา)
          </Alert>
        </div>
      )}
      {order.paymentStatus !== "PAID" && order.orderStatus === "PENDING" && (
        <p className="mt-4 text-body-md text-on-surface-variant">
          อนุมัติแล้วระบบจะเปลี่ยนสถานะคำสั่งซื้อเป็น “{ORDER_STATUS.CONFIRMED.label}” ให้อัตโนมัติ
        </p>
      )}
      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onClose} className={cancelButtonClass}>
          ยกเลิก
        </button>
        {order.paymentStatus !== "REJECTED" && (
          <BusyButton
            tone="danger"
            busy={busy === "REJECTED"}
            disabled={busy === "PAID"}
            onClick={() => save("REJECTED")}
          >
            สลิปไม่ผ่าน
          </BusyButton>
        )}
        <BusyButton busy={busy === "PAID"} disabled={busy === "REJECTED"} onClick={() => save("PAID")}>
          อนุมัติการชำระเงิน
        </BusyButton>
      </div>
    </Modal>
  );
}

// ─────────────────────────── เปลี่ยนสถานะคำสั่งซื้อ ───────────────────────────

export function OrdersStatusModal({
  order,
  onClose,
  onSaved,
}: {
  order: Order;
  onClose: () => void;
  onSaved: (order: Order) => void;
}) {
  const toast = useToast();
  const id = useId();
  const selectId = `${id}-status`;
  const [status, setStatus] = useState<OrderStatus>(order.orderStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFinal = FINAL.includes(order.orderStatus);
  const unchanged = status === order.orderStatus;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || unchanged) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.setOrderStatus(order.id, status);
      toast(`${order.orderNumber} — เปลี่ยนสถานะเป็น “${ORDER_STATUS[status].label}” แล้ว`);
      onSaved(updated);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="เปลี่ยนสถานะคำสั่งซื้อ" onClose={onClose}>
      <OrderSummary order={order} />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="flex items-center justify-between gap-3 text-body-md">
          <span className="text-on-surface-variant">สถานะตอนนี้</span>
          <StatusBadge {...ORDER_STATUS[order.orderStatus]} />
        </div>

        {isFinal && (
          <Alert tone="warning">
            คำสั่งซื้อนี้{order.orderStatus === "CANCELLED" ? "ถูกยกเลิก" : "ส่งมอบ"}แล้ว ระบบจะไม่ให้เปลี่ยนสถานะอีก
          </Alert>
        )}

        <FormField id={selectId} label="สถานะใหม่" required>
          <select
            id={selectId}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as OrderStatus);
              setError(null);
            }}
            aria-required="true"
            className={inputClass}
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS[s].label}
              </option>
            ))}
          </select>
        </FormField>

        {!unchanged && status === "CANCELLED" && (
          <Alert tone="warning">การยกเลิกจะคืนสต็อกสินค้าทุกรายการในคำสั่งซื้อนี้ และเปลี่ยนกลับไม่ได้</Alert>
        )}
        {!unchanged && status === "COMPLETED" && order.deliveryMethod === "PICKUP" && (
          <Alert tone="info">
            คำสั่งซื้อแบบรับที่สาขา แนะนำให้บันทึกการส่งมอบที่หน้า “จุดรับสินค้า” เพื่อเก็บประวัติผู้ส่งมอบ
          </Alert>
        )}
        {error && <Alert>{error}</Alert>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className={cancelButtonClass}>
            ยกเลิก
          </button>
          <BusyButton type="submit" busy={busy} disabled={unchanged}>
            บันทึก
          </BusyButton>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────── ข้อมูลการจัดส่ง ───────────────────────────

function initialCarrier(code: string | null): { select: string; other: string } {
  if (!code) return { select: "", other: "" };
  if (CARRIERS.some((c) => c.code === code)) return { select: code, other: "" };
  return { select: OTHER_CARRIER, other: code };
}

export function OrdersShippingModal({
  order,
  onClose,
  onSaved,
}: {
  order: Order;
  onClose: () => void;
  onSaved: (order: Order) => void;
}) {
  const toast = useToast();
  const id = useId();
  const carrierId = `${id}-carrier`;
  const otherId = `${id}-carrier-other`;
  const trackingId = `${id}-tracking`;
  const markId = `${id}-mark-shipped`;

  const init = initialCarrier(order.shippingCarrier);
  const [carrierSelect, setCarrierSelect] = useState(init.select);
  const [carrierOther, setCarrierOther] = useState(init.other);
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [markShipped, setMarkShipped] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ carrier?: string; other?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carrier = carrierSelect === OTHER_CARRIER ? carrierOther.trim() : carrierSelect;
  const trackingValue = tracking.trim();
  const preview = trackingUrl(carrier, trackingValue);
  // ใส่เลขพัสดุครั้งแรก + คำสั่งซื้อยังไม่จบ/ยังไม่ส่ง → ระบบเลื่อนสถานะเป็น "จัดส่งแล้ว" ให้ได้
  const canMarkShipped =
    !order.trackingNumber && !([...FINAL, "SHIPPED"] as OrderStatus[]).includes(order.orderStatus);

  const carrierHint = "เลือกจากรายการเพื่อให้ลูกค้ากดไปเช็คพัสดุได้ ถ้าไม่มีในรายการให้เลือก “อื่น ๆ”";
  const trackingHint = "เว้นว่างทั้งบริษัทขนส่งและเลขพัสดุแล้วบันทึก = ล้างข้อมูลการจัดส่ง";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const errors: typeof fieldErrors = {};
    if (carrierSelect === OTHER_CARRIER && !carrierOther.trim()) errors.other = "กรุณากรอกชื่อบริษัทขนส่ง";
    else if (trackingValue && !carrier) errors.carrier = "ต้องเลือกบริษัทขนส่งด้วย ไม่งั้นลูกค้าเช็คพัสดุไม่ได้";
    setFieldErrors(errors);
    if (errors.other) {
      document.getElementById(otherId)?.focus();
      return;
    }
    if (errors.carrier) {
      document.getElementById(carrierId)?.focus();
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const updated = await api.setShipping(order.id, {
        shippingCarrier: carrier,
        trackingNumber: trackingValue,
        ...(canMarkShipped && trackingValue ? { markShipped } : {}),
      });
      toast(
        trackingValue
          ? `${order.orderNumber} — บันทึกเลขพัสดุแล้ว ลูกค้าเห็นในหน้าคำสั่งซื้อทันที`
          : `${order.orderNumber} — ล้างข้อมูลการจัดส่งแล้ว`,
      );
      onSaved(updated);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="ข้อมูลการจัดส่ง" onClose={onClose}>
      <OrderSummary order={order} />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField id={carrierId} label="บริษัทขนส่ง" hint={carrierHint} error={fieldErrors.carrier}>
          <select
            id={carrierId}
            value={carrierSelect}
            onChange={(e) => {
              setCarrierSelect(e.target.value);
              setFieldErrors({});
            }}
            aria-invalid={Boolean(fieldErrors.carrier)}
            aria-describedby={describedBy(carrierId, carrierHint, fieldErrors.carrier)}
            className={`${inputClass} ${fieldErrors.carrier ? "input-error" : ""}`}
          >
            <option value="">— ไม่ระบุ —</option>
            {CARRIERS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
            <option value={OTHER_CARRIER}>อื่น ๆ (พิมพ์ชื่อเอง)</option>
          </select>
        </FormField>

        {carrierSelect === OTHER_CARRIER && (
          <FormField id={otherId} label="ชื่อบริษัทขนส่ง" required error={fieldErrors.other}>
            <input
              id={otherId}
              value={carrierOther}
              onChange={(e) => setCarrierOther(e.target.value)}
              maxLength={50}
              aria-required="true"
              aria-invalid={Boolean(fieldErrors.other)}
              aria-describedby={describedBy(otherId, undefined, fieldErrors.other)}
              className={`${inputClass} ${fieldErrors.other ? "input-error" : ""}`}
            />
          </FormField>
        )}

        <FormField id={trackingId} label="เลขพัสดุ" hint={trackingHint}>
          <input
            id={trackingId}
            value={tracking}
            onChange={(e) => {
              setTracking(e.target.value);
              setFieldErrors({});
            }}
            maxLength={50}
            autoComplete="off"
            spellCheck={false}
            placeholder="เช่น TH01234567890"
            aria-describedby={describedBy(trackingId, trackingHint)}
            className={`${inputClass} tabular-nums`}
          />
        </FormField>

        {canMarkShipped && trackingValue && (
          <label htmlFor={markId} className={checkboxLabelClass}>
            <input
              id={markId}
              type="checkbox"
              checked={markShipped}
              onChange={(e) => setMarkShipped(e.target.checked)}
              className="mt-1 shrink-0"
            />
            <span>เปลี่ยนสถานะคำสั่งซื้อเป็น “{ORDER_STATUS.SHIPPED.label}” ทันที</span>
          </label>
        )}

        {preview && (
          <a
            href={preview}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 rounded text-label-md text-primary-container hover:underline ${focusRing}`}
          >
            ลองเปิดหน้าเช็คพัสดุของ {carrierLabel(carrier)}
            <OpenInNewIcon className="h-4 w-4" />
            <span className="sr-only">(เปิดในแท็บใหม่)</span>
          </a>
        )}
        {order.shippedAt && (
          <p className="text-body-md text-on-surface-variant">
            ส่งเข้าขนส่งเมื่อ <span className="tabular-nums">{formatDateTime(order.shippedAt)}</span>
          </p>
        )}
        {error && <Alert>{error}</Alert>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className={cancelButtonClass}>
            ยกเลิก
          </button>
          <BusyButton type="submit" busy={busy}>
            บันทึก
          </BusyButton>
        </div>
      </form>
    </Modal>
  );
}
