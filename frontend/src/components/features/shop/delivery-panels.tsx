"use client";

import { useState } from "react";
import { LocationIcon, StatusBadge, secondaryButtonClass } from "@/csmju";
import { QrCode } from "@/components/shared/qr-code";
import { ContentCopyIcon, LocalShippingIcon, OpenInNewIcon } from "@/components/shared/shop-icons";
import { useToast } from "@/components/shared/toast";
import { carrierLabel, carrierOf, trackingUrl } from "@/lib/carriers";
import { formatDateTime } from "@/lib/format";
import type { Order } from "@/lib/types";
import { focusRing, tonalButtonClass } from "./shop-ui";

/** บัตรรับสินค้าดิจิทัล (PICKUP) — QR ของรหัสรับสินค้าให้เจ้าหน้าที่สแกนที่จุดรับ */
export function PickupPass({ order }: { order: Order }) {
  const pickup = order.pickupLogs[0];
  const cancelled = order.orderStatus === "CANCELLED";
  const pickedUp = Boolean(pickup) || order.orderStatus === "COMPLETED";

  if (cancelled) {
    return (
      <div className="p-6 text-center">
        <p className="text-body-md text-on-surface">คำสั่งซื้อนี้ถูกยกเลิกแล้ว</p>
        <p className="mt-1 text-body-md text-on-surface-variant">รหัสรับสินค้าของคำสั่งซื้อนี้ใช้รับสินค้าไม่ได้แล้ว</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6 text-center">
      <QrCode value={order.pickupCode} size={176} />
      {order.pickupCode && (
        <p className="font-display text-body-lg font-semibold text-on-surface tabular-nums select-all">
          {order.pickupCode}
        </p>
      )}
      {pickedUp ? (
        <div className="space-y-1">
          <StatusBadge tone="success" label="รับสินค้าแล้ว" />
          {pickup && (
            <p className="text-body-md text-on-surface-variant tabular-nums">
              เมื่อ {formatDateTime(pickup.pickupTime)}
            </p>
          )}
        </div>
      ) : order.orderStatus === "READY_FOR_PICKUP" ? (
        <StatusBadge tone="success" label="พร้อมรับสินค้า" />
      ) : (
        <p className="text-body-md text-on-surface-variant">
          รับสินค้าได้เมื่อชำระเงินแล้วและสถานะเป็น &quot;พร้อมรับสินค้า&quot;
        </p>
      )}
      <p className="flex items-start gap-2 text-left text-body-md text-on-surface-variant">
        <LocationIcon className="mt-1 h-4 w-4 shrink-0 text-primary-container" />
        แสดง QR นี้ให้เจ้าหน้าที่ที่จุดรับสินค้าของสาขาวิชาวิทยาการคอมพิวเตอร์ ในวันและเวลาทำการ
      </p>
    </div>
  );
}

/**
 * ข้อมูลจัดส่ง (DELIVERY)
 * ยังไม่มีเลขพัสดุ → บอกว่ารอเจ้าหน้าที่ส่งของเข้าขนส่ง
 * มีแล้ว → ชื่อขนส่ง เลขพัสดุ ลิงก์หน้าเช็คพัสดุ และปุ่มคัดลอกเลข
 */
export function ShippingPanel({ order }: { order: Order }) {
  const toast = useToast();
  const [copyFailed, setCopyFailed] = useState(false);
  const tracking = order.trackingNumber;
  const carrier = carrierOf(order.shippingCarrier);
  const url = trackingUrl(order.shippingCarrier, tracking);

  const copy = async () => {
    if (!tracking) return;
    try {
      await navigator.clipboard.writeText(tracking);
      setCopyFailed(false);
      toast("คัดลอกเลขพัสดุแล้ว");
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <div className="space-y-4 p-6">
      <div className="space-y-1">
        <p className="text-label-md text-on-surface">ที่อยู่จัดส่ง</p>
        <p className="text-body-md whitespace-pre-line text-on-surface-variant">
          {order.shippingAddress || "ยังไม่ได้ระบุที่อยู่"}
        </p>
      </div>

      {!tracking ? (
        <div className="rounded-lg bg-surface px-4 py-6 text-center">
          <LocalShippingIcon className="mx-auto mb-2 h-8 w-8 text-outline" />
          <p className="text-body-md text-on-surface">ยังไม่มีเลขพัสดุ</p>
          <p className="mt-1 text-body-md text-on-surface-variant">
            เจ้าหน้าที่จะใส่ชื่อขนส่งและเลขพัสดุให้เมื่อส่งของเข้าขนส่งแล้ว
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <dl className="space-y-3">
            <div>
              <dt className="text-label-md text-on-surface-variant">บริษัทขนส่ง</dt>
              <dd className="text-body-md text-on-surface">{carrierLabel(order.shippingCarrier)}</dd>
            </div>
            <div>
              <dt className="text-label-md text-on-surface-variant">เลขพัสดุ</dt>
              <dd className="font-display text-body-lg font-semibold text-on-surface tabular-nums select-all">
                {tracking}
              </dd>
            </div>
            {order.shippedAt && (
              <div>
                <dt className="text-label-md text-on-surface-variant">ส่งเข้าขนส่งเมื่อ</dt>
                <dd className="text-body-md text-on-surface tabular-nums">{formatDateTime(order.shippedAt)}</dd>
              </div>
            )}
          </dl>

          <div className="flex flex-col gap-3">
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" className={tonalButtonClass}>
                <OpenInNewIcon className="h-4 w-4" />
                ติดตามพัสดุที่ {carrier?.label}
                <span className="sr-only"> (เปิดในแท็บใหม่)</span>
              </a>
            )}
            <button
              type="button"
              onClick={copy}
              className={`${secondaryButtonClass} flex min-h-11 items-center justify-center gap-2 md:min-h-0 ${focusRing}`}
            >
              <ContentCopyIcon className="h-4 w-4" />
              คัดลอกเลขพัสดุ
            </button>
          </div>

          {carrier?.paste && (
            <p className="text-body-md text-on-surface-variant">
              เว็บไซต์ของ {carrier.label} ต้องกรอกเลขพัสดุเอง กดคัดลอกเลขพัสดุแล้วนำไปวางในช่องค้นหา
            </p>
          )}
          {copyFailed && (
            <p className="text-body-md text-error" role="alert">
              คัดลอกไม่สำเร็จ กรุณาเลือกเลขพัสดุด้านบนแล้วคัดลอกเอง
            </p>
          )}
        </div>
      )}

      {order.orderStatus === "COMPLETED" && <StatusBadge tone="success" label="ได้รับพัสดุแล้ว" />}
    </div>
  );
}
