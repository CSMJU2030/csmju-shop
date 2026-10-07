"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  SearchIcon,
  StatusBadge,
  cardClass,
  inputClass,
  secondaryButtonClass,
  tdClass,
  thClass,
} from "@/csmju";
import { ApiErrorView, errorMessage } from "@/components/shared/api-error-view";
import { describedBy, FormField } from "@/components/shared/form-field";
import { Pagination } from "@/components/shared/pagination";
import { useMe } from "@/components/shared/session-context";
import { CheckCircleIcon, QrCodeIcon } from "@/components/shared/shop-icons";
import { Alert, EmptyState, ForbiddenState, SkeletonBar } from "@/components/shared/states";
import { useToast } from "@/components/shared/toast";
import { ApiError, api, type Page } from "@/lib/api";
import { formatDateTime, formatMoney, formatPhone } from "@/lib/format";
import { PERMISSION, can } from "@/lib/permissions";
import { DELIVERY_METHOD_LABEL, ORDER_STATUS, PAYMENT_STATUS } from "@/lib/status";
import type { Order, PickupLog, PickupVerification } from "@/lib/types";
import { OrdersItemList } from "./orders-item-list";
import { BusyButton, CardHeader, checkboxLabelClass, focusRing, linkClass } from "./orders-ui";
import { PickupLogsSkeleton } from "./pickup-skeleton";
import { QrScanner } from "./qr-scanner";

const LOGS_LIMIT = 10;
const CODE_INPUT_ID = "pickup-code";
const NOTES_ID = "pickup-notes";
const ID_CHECK_ID = "pickup-id-checked";
const CODE_HINT = "รหัสอยู่บนบัตรรับสินค้าในหน้าคำสั่งซื้อของลูกค้า";

type Lookup =
  | { status: "idle" }
  | { status: "loading"; code: string }
  | { status: "error"; code: string; error: unknown }
  | { status: "ready"; result: PickupVerification }
  | { status: "done"; log: PickupLog };

type LogsState = { status: "loading" } | { status: "error"; error: unknown } | { status: "ready"; data: Page<PickupLog> };

/**
 * ดึงรหัสรับสินค้าออกจากข้อความใน QR
 * บัตรรับสินค้าเก็บ pickupCode ตรง ๆ แต่เผื่อวันหลังเปลี่ยนไปใส่เป็นลิงก์ จึงมองหารูปแบบ PICKUP-XXXX ก่อน
 */
function extractPickupCode(text: string): string {
  return (text.match(/PICKUP-[A-Z0-9-]+/i)?.[0] ?? text).trim().toUpperCase();
}

/** เหตุผลที่ส่งมอบไม่ได้ (null = ส่งมอบได้) */
function blockedReason(result: PickupVerification): string | null {
  const { order } = result;
  if (result.alreadyPickedUp) return null;
  if (order.orderStatus === "CANCELLED") return "คำสั่งซื้อนี้ถูกยกเลิกแล้ว ส่งมอบสินค้าไม่ได้";
  if (order.deliveryMethod === "DELIVERY") return "คำสั่งซื้อนี้เป็นแบบจัดส่งพัสดุ ไม่ได้รับที่สาขา";
  if (order.paymentStatus !== "PAID") {
    return `ยังส่งมอบไม่ได้ เพราะสถานะการชำระเงินคือ “${PAYMENT_STATUS[order.paymentStatus].label}” ต้องอนุมัติการชำระเงินที่หน้าจัดการคำสั่งซื้อก่อน`;
  }
  if (!result.valid) return "คำสั่งซื้อนี้ยังส่งมอบไม่ได้ กรุณาตรวจสถานะที่หน้าจัดการคำสั่งซื้อ";
  return null;
}

function focusCodeInput() {
  const input = document.getElementById(CODE_INPUT_ID);
  if (input instanceof HTMLInputElement) {
    input.focus();
    input.select();
  }
}

export function PickupDesk() {
  const me = useMe();
  const toast = useToast();
  const canRead = can(me?.permissions, PERMISSION.PICKUP_READ);
  const canCreate = can(me?.permissions, PERMISSION.PICKUP_CREATE);

  const [code, setCode] = useState("");
  const [scanned, setScanned] = useState<string | null>(null);
  const [lookup, setLookup] = useState<Lookup>({ status: "idle" });
  const [notes, setNotes] = useState("");
  const [idChecked, setIdChecked] = useState(false);
  const [idCheckError, setIdCheckError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [logs, setLogs] = useState<LogsState>({ status: "loading" });
  const [logsPage, setLogsPage] = useState(1);
  const [logsKey, setLogsKey] = useState(0);
  const lookupBusy = useRef(false);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;
    setLogs({ status: "loading" });
    api
      .listPickupLogs({ page: logsPage, limit: LOGS_LIMIT })
      .then((data) => {
        if (!cancelled) setLogs({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!cancelled) setLogs({ status: "error", error });
      });
    return () => {
      cancelled = true;
    };
  }, [canRead, logsPage, logsKey]);

  const reloadLogs = useCallback(() => setLogsKey((k) => k + 1), []);

  const verify = useCallback(async (raw: string) => {
    const value = raw.trim().toUpperCase();
    if (!value || lookupBusy.current) return;
    lookupBusy.current = true;
    setLookup({ status: "loading", code: value });
    setNotes("");
    setIdChecked(false);
    setIdCheckError(null);
    setConfirmError(null);
    try {
      const result = await api.verifyPickup(value);
      setLookup({ status: "ready", result });
    } catch (error) {
      setLookup({ status: "error", code: value, error });
    } finally {
      lookupBusy.current = false;
    }
  }, []);

  const onSubmitCode = (event: FormEvent) => {
    event.preventDefault();
    setScanned(null); // พิมพ์เอง → ล้างผลสแกนเก่า
    void verify(code);
  };

  /** กล้องอ่าน QR ได้ — เติมรหัสลงช่องแล้วตรวจให้เลย */
  const onScan = useCallback(
    (text: string) => {
      const found = extractPickupCode(text);
      setScanned(found);
      setCode(found);
      void verify(found);
    },
    [verify],
  );

  const onConfirm = async (event: FormEvent) => {
    event.preventDefault();
    if (confirming || lookup.status !== "ready") return;
    const pickupCode = lookup.result.order.pickupCode;
    if (!pickupCode) return;
    if (!idChecked) {
      setIdCheckError("กรุณาตรวจบัตรของผู้มารับให้ตรงกับชื่อผู้รับ แล้วติ๊กช่องนี้ก่อนบันทึก");
      document.getElementById(ID_CHECK_ID)?.focus();
      return;
    }

    setConfirming(true);
    setConfirmError(null);
    try {
      // ตัวตนของเจ้าหน้าที่ผู้ส่งมอบมาจาก token ฝั่ง backend — หน้าเว็บไม่ส่ง id เจ้าหน้าที่
      const log = await api.createPickupLog({ pickupCode, notes: notes.trim() || undefined });
      toast(`บันทึกการส่งมอบ ${log.order.orderNumber} แล้ว`);
      setLookup({ status: "done", log });
      setCode("");
      setScanned(null);
      setNotes("");
      setIdChecked(false);
      if (logsPage === 1) reloadLogs();
      else setLogsPage(1);
    } catch (e) {
      setConfirmError(errorMessage(e));
    } finally {
      setConfirming(false);
    }
  };

  const reset = () => {
    setLookup({ status: "idle" });
    setCode("");
    setScanned(null);
    focusCodeInput();
  };

  if (!canRead) {
    return <ForbiddenState message="คุณไม่มีสิทธิ์ใช้จุดรับสินค้า หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบย่อยนี้" />;
  }

  const verifying = lookup.status === "loading";

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-2">
        {/* ── รับรหัสจากลูกค้า ── */}
        <section aria-labelledby="pickup-input" className={cardClass}>
          <CardHeader id="pickup-input" title="รับรหัสจากลูกค้า" />
          <div className="space-y-4 p-6">
            <QrScanner onDetect={onScan} disabled={verifying} />

            {scanned && (
              <Alert tone="info">
                สแกนได้รหัส <span className="font-semibold tabular-nums">{scanned}</span>
                {verifying && " กำลังตรวจสอบ..."}
              </Alert>
            )}

            <form onSubmit={onSubmitCode} className="space-y-4" noValidate>
              <FormField
                id={CODE_INPUT_ID}
                label="รหัสรับสินค้า"
                hint={CODE_HINT}
              >
                <input
                  id={CODE_INPUT_ID}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={50}
                  placeholder="เช่น PICKUP-123456"
                  aria-describedby={describedBy(CODE_INPUT_ID, CODE_HINT)}
                  className={`${inputClass} tabular-nums`}
                />
              </FormField>
              <div className="flex justify-end">
                <BusyButton type="submit" busy={verifying} disabled={!code.trim()}>
                  <SearchIcon className="h-4 w-4" />
                  ค้นหา
                </BusyButton>
              </div>
            </form>
          </div>
        </section>

        {/* ── ผลการตรวจสอบ ── */}
        <section aria-labelledby="pickup-result" aria-live="polite" className={cardClass}>
          <CardHeader id="pickup-result" title="ผลการตรวจสอบ" />
          <div className="p-6">
            {lookup.status === "idle" && (
              <EmptyState
                title="ยังไม่มีรายการที่ตรวจสอบ"
                description="สแกน QR หรือพิมพ์รหัสรับสินค้าจากบัตรของลูกค้า เพื่อดูคำสั่งซื้อและบันทึกการส่งมอบ"
                icon={<QrCodeIcon className="h-10 w-10" />}
                action={
                  <button type="button" onClick={focusCodeInput} className={`${secondaryButtonClass} ${focusRing}`}>
                    พิมพ์รหัสรับสินค้า
                  </button>
                }
              />
            )}

            {lookup.status === "loading" && (
              <div aria-busy="true" className="space-y-4">
                <span className="sr-only">กำลังตรวจสอบรหัส...</span>
                <SkeletonBar className="h-7 w-2/3" />
                <SkeletonBar className="h-16 w-full" />
                <SkeletonBar className="h-16 w-full" />
                <SkeletonBar className="h-11 w-full" />
              </div>
            )}

            {lookup.status === "error" && (
              <LookupError error={lookup.error} code={lookup.code} onRetry={() => verify(lookup.code)} onReset={reset} />
            )}

            {lookup.status === "done" && (
              <div className="py-6 text-center">
                <CheckCircleIcon className="mx-auto h-10 w-10 text-success" />
                <p className="mt-3 font-display text-headline-md text-on-surface">บันทึกการส่งมอบแล้ว</p>
                <p className="mt-1 text-body-md text-on-surface-variant">
                  <span className="tabular-nums">{lookup.log.order.orderNumber}</span> ของ{" "}
                  {lookup.log.order.recipientName} · สถานะเป็น “{ORDER_STATUS.COMPLETED.label}” แล้ว
                </p>
                <button type="button" onClick={reset} className={`${secondaryButtonClass} ${focusRing} mt-6`}>
                  ตรวจรหัสถัดไป
                </button>
              </div>
            )}

            {lookup.status === "ready" && (
              <VerificationResult
                result={lookup.result}
                canCreate={canCreate}
                notes={notes}
                onNotes={setNotes}
                idChecked={idChecked}
                onIdChecked={(checked) => {
                  setIdChecked(checked);
                  if (checked) setIdCheckError(null);
                }}
                idCheckError={idCheckError}
                confirming={confirming}
                confirmError={confirmError}
                onConfirm={onConfirm}
                onCancel={reset}
              />
            )}
          </div>
        </section>
      </div>

      {/* ── ประวัติการส่งมอบ ── */}
      <section aria-labelledby="pickup-logs" className={cardClass}>
        <CardHeader id="pickup-logs" title="ประวัติการส่งมอบล่าสุด" />
        {logs.status === "loading" && <PickupLogsSkeleton />}
        {logs.status === "error" && <ApiErrorView error={logs.error} onRetry={reloadLogs} />}
        {logs.status === "ready" &&
          (logs.data.items.length === 0 ? (
            <EmptyState
              title="ยังไม่มีประวัติการส่งมอบ"
              description="เมื่อบันทึกการส่งมอบสินค้าให้ลูกค้าแล้ว รายการจะแสดงที่นี่พร้อมชื่อเจ้าหน้าที่ผู้ส่งมอบ"
              icon={<CheckCircleIcon className="h-10 w-10" />}
              action={
                <button type="button" onClick={focusCodeInput} className={`${secondaryButtonClass} ${focusRing}`}>
                  พิมพ์รหัสรับสินค้า
                </button>
              }
            />
          ) : (
            <>
              <div className="relative overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <caption className="sr-only">ประวัติการส่งมอบสินค้าล่าสุด</caption>
                  <thead>
                    <tr className="border-b border-outline-variant/40 bg-surface text-label-md text-on-surface-variant">
                      <th scope="col" className={thClass}>
                        เวลาที่รับ
                      </th>
                      <th scope="col" className={thClass}>
                        เลขที่คำสั่งซื้อ
                      </th>
                      <th scope="col" className={thClass}>
                        ผู้รับสินค้า
                      </th>
                      <th scope="col" className={thClass}>
                        เจ้าหน้าที่ผู้ส่งมอบ
                      </th>
                      <th scope="col" className={thClass}>
                        หมายเหตุ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.data.items.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-outline-variant/40 text-body-md transition-colors last:border-0 hover:bg-surface/50"
                      >
                        <td className={`${tdClass} whitespace-nowrap text-on-surface-variant tabular-nums`}>
                          {formatDateTime(log.pickupTime)}
                        </td>
                        <td className={`${tdClass} whitespace-nowrap`}>
                          <p className="font-medium text-on-surface tabular-nums">{log.order.orderNumber}</p>
                          {log.order.pickupCode && (
                            <p className="text-label-sm text-secondary tabular-nums">{log.order.pickupCode}</p>
                          )}
                        </td>
                        <td className={tdClass}>
                          <p className="text-on-surface">{log.order.recipientName}</p>
                          <p className="text-on-surface-variant">{log.order.customerEmail}</p>
                        </td>
                        <td className={`${tdClass} text-on-surface-variant`}>{log.staffEmail}</td>
                        <td className={`${tdClass} text-on-surface-variant`}>{log.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination meta={logs.data.meta} onPage={setLogsPage} />
            </>
          ))}
      </section>
    </div>
  );
}

function LookupError({
  error,
  code,
  onRetry,
  onReset,
}: {
  error: unknown;
  code: string;
  onRetry: () => void;
  onReset: () => void;
}) {
  if (error instanceof ApiError && error.code === "NOT_FOUND") {
    return (
      <EmptyState
        title="ไม่พบคำสั่งซื้อจากรหัสนี้"
        description={`รหัส “${code}” ไม่ถูกต้อง ตรวจรหัสบนบัตรรับสินค้าอีกครั้ง หรือสแกน QR ใหม่`}
        icon={<QrCodeIcon className="h-10 w-10" />}
        action={
          <button type="button" onClick={onReset} className={`${secondaryButtonClass} ${focusRing}`}>
            พิมพ์รหัสใหม่
          </button>
        }
      />
    );
  }
  if (error instanceof ApiError && ["VALIDATION_ERROR", "CONFLICT", "BAD_REQUEST"].includes(error.code)) {
    return (
      <div className="space-y-4">
        <Alert>{error.message}</Alert>
        <div className="flex justify-end">
          <button type="button" onClick={onReset} className={`${secondaryButtonClass} ${focusRing}`}>
            พิมพ์รหัสใหม่
          </button>
        </div>
      </div>
    );
  }
  return <ApiErrorView error={error} onRetry={onRetry} />;
}

function VerificationResult({
  result,
  canCreate,
  notes,
  onNotes,
  idChecked,
  onIdChecked,
  idCheckError,
  confirming,
  confirmError,
  onConfirm,
  onCancel,
}: {
  result: PickupVerification;
  canCreate: boolean;
  notes: string;
  onNotes: (value: string) => void;
  idChecked: boolean;
  onIdChecked: (checked: boolean) => void;
  idCheckError: string | null;
  confirming: boolean;
  confirmError: string | null;
  onConfirm: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  const { order } = result;
  const reason = blockedReason(result);
  const deliverable = !result.alreadyPickedUp && reason === null;
  const lastPickup = order.pickupLogs[0];
  const notesHint = "ไม่บังคับ เช่น ผู้รับแทน หรือสินค้าที่ขาด";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {result.alreadyPickedUp ? (
          <StatusBadge tone="warning" label="รับสินค้าไปแล้ว" />
        ) : deliverable ? (
          <StatusBadge tone="success" label="พร้อมส่งมอบ" />
        ) : (
          <StatusBadge tone="error" label="ยังส่งมอบไม่ได้" />
        )}
        <span className="text-label-md text-on-surface tabular-nums">{order.orderNumber}</span>
      </div>

      <RecipientBlock order={order} />

      <div>
        <h3 className="mb-3 text-label-md text-on-surface">
          รายการสินค้า <span className="tabular-nums">({order.orderItems.length})</span>
        </h3>
        <OrdersItemList items={order.orderItems} />
      </div>

      <dl className="space-y-2 text-body-md">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-on-surface-variant">ยอดรวม</dt>
          <dd className="font-semibold text-on-surface tabular-nums">{formatMoney(order.totalAmount)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-on-surface-variant">การชำระเงิน</dt>
          <dd>
            <StatusBadge {...PAYMENT_STATUS[order.paymentStatus]} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-on-surface-variant">สถานะคำสั่งซื้อ</dt>
          <dd>
            <StatusBadge {...ORDER_STATUS[order.orderStatus]} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-on-surface-variant">การรับสินค้า</dt>
          <dd className="text-on-surface">{DELIVERY_METHOD_LABEL[order.deliveryMethod]}</dd>
        </div>
      </dl>

      {result.alreadyPickedUp && (
        <Alert tone="warning" title="คำสั่งซื้อนี้รับสินค้าไปแล้ว ห้ามส่งมอบซ้ำ">
          {lastPickup ? (
            <>
              ส่งมอบเมื่อ <span className="tabular-nums">{formatDateTime(lastPickup.pickupTime)}</span> โดย{" "}
              {lastPickup.staffEmail}
              {lastPickup.notes ? ` · หมายเหตุ: ${lastPickup.notes}` : ""}
            </>
          ) : (
            "มีบันทึกการส่งมอบของคำสั่งซื้อนี้อยู่แล้ว"
          )}
        </Alert>
      )}

      {reason && (
        <div className="space-y-3">
          <Alert tone="warning">{reason}</Alert>
          <Link href={`/staff/orders?search=${encodeURIComponent(order.orderNumber)}`} className={linkClass}>
            ไปหน้าจัดการคำสั่งซื้อ
          </Link>
        </div>
      )}

      {deliverable && canCreate && (
        <form onSubmit={onConfirm} className="space-y-4 border-t border-outline-variant/40 pt-6" noValidate>
          <FormField id={NOTES_ID} label="หมายเหตุ" hint={notesHint}>
            <textarea
              id={NOTES_ID}
              value={notes}
              onChange={(e) => onNotes(e.target.value)}
              rows={2}
              maxLength={500}
              aria-describedby={describedBy(NOTES_ID, notesHint)}
              className={inputClass}
            />
          </FormField>

          <div className="space-y-2">
            <label htmlFor={ID_CHECK_ID} className={checkboxLabelClass}>
              <input
                id={ID_CHECK_ID}
                type="checkbox"
                checked={idChecked}
                onChange={(e) => onIdChecked(e.target.checked)}
                aria-required="true"
                aria-invalid={Boolean(idCheckError)}
                aria-describedby={idCheckError ? `${ID_CHECK_ID}-error` : undefined}
                className="mt-1 shrink-0"
              />
              <span>
                ตรวจบัตรของผู้มารับแล้ว ตรงกับชื่อผู้รับ “{order.recipientName}”
                <span className="text-error" aria-hidden="true">
                  {" "}
                  *
                </span>
              </span>
            </label>
            {idCheckError && (
              <p id={`${ID_CHECK_ID}-error`} role="alert" className="text-label-md text-error">
                {idCheckError}
              </p>
            )}
          </div>

          {confirmError && <Alert>{confirmError}</Alert>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className={`${secondaryButtonClass} ${focusRing}`}>
              ยกเลิก
            </button>
            <BusyButton type="submit" busy={confirming}>
              <CheckCircleIcon className="h-4 w-4" />
              บันทึกการส่งมอบ
            </BusyButton>
          </div>
        </form>
      )}

      {deliverable && !canCreate && (
        <Alert tone="info">คุณดูข้อมูลได้ แต่ไม่มีสิทธิ์บันทึกการส่งมอบสินค้า กรุณาติดต่อผู้ดูแลระบบย่อยนี้</Alert>
      )}
    </div>
  );
}

function RecipientBlock({ order }: { order: Order }) {
  const initial = order.recipientName.trim().slice(0, 1) || "?";
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-outline-variant/50 bg-primary-container text-label-md text-white"
      >
        {initial}
      </span>
      <div className="min-w-0">
        <p className="text-body-md font-semibold text-on-surface">{order.recipientName}</p>
        <p className="text-body-md text-on-surface-variant">
          <span className="tabular-nums">{formatPhone(order.recipientPhone)}</span> · {order.customerEmail}
        </p>
      </div>
    </div>
  );
}
