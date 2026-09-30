'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import {
  baht,
  DELIVERY_TIMELINE,
  PAYMENT_STATUS_TH,
  PICKUP_TIMELINE,
  thaiDateTime,
} from '@/lib/format';
import { carrierOf, trackingUrl } from '@/lib/carriers';
import { Button, Card, ErrorState, Pill, Spinner } from '@/components/ui';
import QrCode from '@/components/QrCode';
import { ArrowLeft, Check, Clock, MapPin, Truck } from '@/components/icons';

/** แปลง order_status เป็นตำแหน่งบนไทม์ไลน์ (ใช้ได้ทั้งแบบมารับเองและแบบจัดส่ง) */
function stageIndex(order) {
  if (order.order_status === 'completed') return 3;
  if (order.order_status === 'ready_for_pickup' || order.order_status === 'shipped') return 2;
  if (order.order_status === 'preparing') return 1;
  if (order.payment_status === 'paid' || order.order_status === 'confirmed') return 0;
  return -1;
}

export default function DigitalPassPage() {
  const { id } = useParams();
  const [state, setState] = useState({ status: 'loading', order: null, error: null });

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }));
    api
      .getOrder(id)
      .then((r) => setState({ status: 'ready', order: r.data, error: null }))
      .catch((error) => setState({ status: 'error', order: null, error }));
  }, [id]);

  useEffect(load, [load]);

  if (state.status === 'loading') return <Spinner label="กำลังโหลดคำสั่งซื้อ…" />;
  if (state.status === 'error')
    return (
      <div className="p-6">
        <ErrorState error={state.error} onRetry={load} />
      </div>
    );

  const order = state.order;
  const stage = stageIndex(order);
  const pickedUp = (order.pickup_logs ?? []).length > 0;
  const isPickup = order.delivery_method === 'pickup';
  const timeline = isPickup ? PICKUP_TIMELINE : DELIVERY_TIMELINE;
  const carrier = carrierOf(order.shipping_carrier);
  const trackUrl = trackingUrl(order.shipping_carrier, order.tracking_number);

  return (
    <div className="px-4 py-7 sm:px-6 sm:py-9">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy-700"
        >
          <ArrowLeft className="size-4" />
          กลับหน้าร้าน
        </Link>
        <Pill tone="navy">{isPickup ? 'บัตรรับสินค้า' : 'คำสั่งซื้อแบบจัดส่ง'}</Pill>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* ── ซ้าย: สถานะและสถานที่ ── */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
              <h1 className="text-lg font-bold">สถานะคำสั่งซื้อ</h1>
              <p className="font-mono text-sm text-slate-500">{order.order_number}</p>
            </div>

            <ol className="relative space-y-0">
              {timeline.map((step, i) => {
                const done = i < stage;
                const current = i === stage;
                const last = i === timeline.length - 1;

                return (
                  <li key={step.key} className="flex gap-4 pb-6 last:pb-0">
                    <div className="flex flex-col items-center">
                      <span
                        className={`grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                          done
                            ? 'border-jade-600 bg-jade-600 text-white'
                            : current
                              ? 'border-jade-600 bg-white text-jade-600'
                              : 'border-slate-200 bg-white text-slate-300'
                        }`}
                      >
                        {done ? (
                          <Check className="size-4" />
                        ) : (
                          <span className="size-2 rounded-full bg-current" />
                        )}
                      </span>
                      {!last && (
                        <span className={`w-0.5 flex-1 ${i < stage ? 'bg-jade-600' : 'bg-slate-200'}`} />
                      )}
                    </div>

                    <div className="pt-0.5 leading-tight">
                      <p className={`font-semibold ${done || current ? 'text-navy-900' : 'text-slate-400'}`}>
                        {step.th}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">{step.en}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <MapPin className="size-4.5 text-jade-600" />
              {isPickup ? 'จุดรับสินค้า' : 'ที่อยู่จัดส่ง'}
            </h2>

            {isPickup ? (
              <>
                <p className="text-sm text-slate-600">
                  ห้องพักสาขาวิทยาการคอมพิวเตอร์ ชั้น 1 อาคารศูนย์นักศึกษา
                  <br />
                  แสดง QR ทางขวาให้เจ้าหน้าที่ที่เคาน์เตอร์เพื่อรับสินค้า
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill tone="jade">
                    <Clock className="size-3.5" />
                    09:00 – 16:30
                  </Pill>
                  <Pill tone="jade">จันทร์ – ศุกร์</Pill>
                </div>
              </>
            ) : (
              <p className="text-sm whitespace-pre-line text-slate-600">
                {order.shipping_address || '— ยังไม่ได้ระบุที่อยู่ —'}
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-semibold">สรุปยอด</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">ค่าจัดส่ง</dt>
                <dd>{baht(order.shipping_fee)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">สถานะการชำระเงิน</dt>
                <dd className="font-medium">
                  {PAYMENT_STATUS_TH[order.payment_status] ?? order.payment_status}
                </dd>
              </div>
              <div className="flex justify-between border-t border-hairline pt-2 text-base">
                <dt className="font-medium">ยอดรวม</dt>
                <dd className="font-bold">{baht(order.total_amount)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-slate-400">สั่งซื้อเมื่อ {thaiDateTime(order.created_at)}</p>
          </Card>
        </div>

        {/* ── ขวา: บัตรดิจิทัล ── */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="overflow-hidden">
            <div className="bg-linear-to-br from-jade-700 to-jade-500 px-5 py-4 text-white">
              <p className="text-lg font-bold">{isPickup ? 'บัตรรับสินค้า' : 'ข้อมูลการจัดส่ง'}</p>
              <p className="mt-0.5 font-mono text-sm text-white/80">{order.order_number}</p>
            </div>

            {isPickup ? (
              <div className="flex flex-col items-center gap-3 px-5 py-6">
                <QrCode value={order.pickup_code} size={172} />
                <p className="text-sm font-medium text-jade-700">สแกนที่เคาน์เตอร์รับสินค้า</p>
                {order.pickup_code && (
                  <p className="font-mono text-xs tracking-wider text-slate-500">{order.pickup_code}</p>
                )}
                {pickedUp && <Pill tone="jade">รับสินค้าเรียบร้อยแล้ว</Pill>}
              </div>
            ) : (
              <ShippingPanel order={order} carrier={carrier} trackUrl={trackUrl} />
            )}

            <div className="border-t border-hairline px-5 py-4">
              <p className="mb-2.5 text-sm font-medium">
                {isPickup ? 'รายการที่ต้องรับ' : 'รายการในพัสดุ'} ({(order.order_items ?? []).length})
              </p>
              <ul className="space-y-2">
                {(order.order_items ?? []).map((it) => (
                  <li key={it.item_id} className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate">{it.variant?.product?.name}</span>
                      <span className="text-xs text-slate-500">{it.variant?.variant_name}</span>
                    </span>
                    <span className="shrink-0 text-slate-500">×{it.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-hairline p-4">
              <Button tone="outlineNavy" className="w-full" onClick={load}>
                รีเฟรชสถานะ
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * กล่องข้อมูลจัดส่งฝั่งลูกค้า
 * ยังไม่มีเลขพัสดุ → บอกตรง ๆ ว่ารอเจ้าหน้าที่ส่งของเข้าขนส่ง
 * มีแล้ว → โชว์ชื่อขนส่ง เลขพัสดุ ปุ่มเปิดหน้าเช็คพัสดุ และปุ่มคัดลอกเลข
 */
function ShippingPanel({ order, carrier, trackUrl }) {
  const [copied, setCopied] = useState(false);
  const tracking = order.tracking_number;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tracking);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* เบราว์เซอร์ไม่ให้คัดลอก — ลูกค้ายังเลือกเลขเองได้ */
    }
  };

  if (!tracking) {
    return (
      <div className="px-5 py-6 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-navy-50 text-navy-300">
          <Truck className="size-7" />
        </span>
        <p className="mt-3 font-medium">ยังไม่มีเลขพัสดุ</p>
        <p className="mt-1 text-sm text-slate-500">
          เจ้าหน้าที่จะใส่ชื่อขนส่งและเลขพัสดุให้ทันทีที่ส่งของเข้าขนส่ง
          <br />
          กดรีเฟรชสถานะด้านล่างเพื่อเช็คอีกครั้ง
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 py-6">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-jade-50 text-jade-700">
          <Truck className="size-5.5" />
        </span>
        <div className="leading-tight">
          <p className="text-xs text-slate-500">บริษัทขนส่ง</p>
          <p className="font-semibold">{carrier?.label}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-jade-500 bg-jade-50 px-4 py-3 text-center">
        <p className="text-xs text-slate-500">เลขติดตามพัสดุ</p>
        <p className="mt-1 font-mono text-lg font-bold tracking-wider text-navy-900 select-all">
          {tracking}
        </p>
      </div>

      <div className="mt-3 space-y-2">
        {trackUrl ? (
          <Button
            tone="jade"
            as="a"
            href={trackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            ติดตามพัสดุที่ {carrier.label} ↗
          </Button>
        ) : carrier?.track ? (
          <Button tone="jade" as="a" href={carrier.track} target="_blank" rel="noopener noreferrer" className="w-full">
            เปิดหน้าเช็คพัสดุ {carrier.label} ↗
          </Button>
        ) : null}

        <Button tone="outlineNavy" className="w-full" onClick={copy}>
          {copied ? 'คัดลอกเลขพัสดุแล้ว' : 'คัดลอกเลขพัสดุ'}
        </Button>
      </div>

      {carrier?.paste && (
        <p className="mt-2 text-xs text-slate-500">
          เว็บของ {carrier.label} ต้องกรอกเลขเอง — กดคัดลอกแล้วนำไปวางในช่องค้นหาได้เลย
        </p>
      )}

      {order.shipped_at && (
        <p className="mt-3 text-xs text-slate-400">ส่งเข้าขนส่งเมื่อ {thaiDateTime(order.shipped_at)}</p>
      )}
      {order.order_status === 'completed' && (
        <div className="mt-3 flex justify-center">
          <Pill tone="jade">ได้รับพัสดุเรียบร้อยแล้ว</Pill>
        </div>
      )}
    </div>
  );
}
