'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { baht, ORDER_STATUS_TH, PAYMENT_STATUS_TH, thaiDateTime } from '@/lib/format';
import { Button, Card, ErrorState, Pill, Spinner } from '@/components/ui';
import { Eye } from '@/components/icons';
import { CARRIERS, carrierLabel, trackingUrl } from '@/lib/carriers';

/** ตัวกรองด้านบน — "ต้องดำเนินการ" คือค่าเริ่มต้นเพราะเป็นงานที่ค้างอยู่จริง */
const TABS = [
  { key: 'todo', label: 'ต้องดำเนินการ', test: (o) => ['pending', 'waiting_verify'].includes(o.payment_status) },
  { key: 'paid', label: 'ชำระแล้ว', test: (o) => o.payment_status === 'paid' },
  {
    key: 'shipping',
    label: 'รอส่งพัสดุ',
    // จ่ายเงินแล้ว เป็นแบบจัดส่ง แต่ยังไม่มีเลขพัสดุ = งานที่ต้องเอาของเข้าขนส่ง
    test: (o) =>
      o.delivery_method === 'delivery' &&
      o.payment_status === 'paid' &&
      !o.tracking_number &&
      o.order_status !== 'cancelled',
  },
  { key: 'done', label: 'รับสินค้าแล้ว', test: (o) => o.order_status === 'completed' },
  { key: 'all', label: 'ทั้งหมด', test: () => true },
];

const PAYMENT_TONE = { paid: 'jade', waiting_verify: 'amber', pending: 'rose', rejected: 'rose' };

export default function StaffOrdersPage() {
  const [state, setState] = useState({ status: 'loading', orders: [], error: null });
  const [tab, setTab] = useState('todo');
  const [acting, setActing] = useState(null);
  const [notice, setNotice] = useState(null);
  /** คำสั่งซื้อที่กดลบไว้และรอยืนยัน (เก็บทั้ง object เพื่อโชว์เลขที่ในกล่องยืนยัน) */
  const [pendingDelete, setPendingDelete] = useState(null);
  /** ออร์เดอร์ที่กำลังกรอกเลขพัสดุอยู่ + ค่าที่พิมพ์ไว้ */
  const [shippingFor, setShippingFor] = useState(null);
  const [shipForm, setShipForm] = useState({ carrier: '', tracking: '' });

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }));
    api
      .listOrders()
      .then((r) => setState({ status: 'ready', orders: r.data, error: null }))
      .catch((error) => setState({ status: 'error', orders: [], error }));
  }, []);

  useEffect(load, [load]);

  const shown = useMemo(
    () => state.orders.filter(TABS.find((t) => t.key === tab).test),
    [state.orders, tab],
  );
  const todoCount = state.orders.filter(TABS[0].test).length;

  const act = async (order, fn, message) => {
    setActing(order.order_id);
    setNotice(null);
    try {
      await fn();
      setNotice(`${order.order_number} — ${message}`);
      load();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setActing(null);
    }
  };

  /** เปิดฟอร์มกรอกเลขพัสดุ พร้อมเติมค่าที่เคยบันทึกไว้ */
  const openShipping = (order) => {
    setNotice(null);
    setShippingFor(order.order_id);
    setShipForm({ carrier: order.shipping_carrier ?? '', tracking: order.tracking_number ?? '' });
  };

  const saveShipping = async (order) => {
    await act(
      order,
      () =>
        api.setShipping(order.order_id, {
          shipping_carrier: shipForm.carrier.trim(),
          tracking_number: shipForm.tracking.trim(),
        }),
      shipForm.tracking.trim() ? 'บันทึกเลขพัสดุแล้ว ลูกค้าเห็นเลขนี้ในหน้าสถานะคำสั่งซื้อทันที' : 'ล้างข้อมูลการจัดส่งแล้ว',
    );
    setShippingFor(null);
  };

  /** ลบจริงหลังผู้ใช้กดยืนยันในกล่องเตือน */
  const confirmDelete = async () => {
    const order = pendingDelete;
    if (!order) return;
    setPendingDelete(null);
    await act(order, () => api.deleteOrder(order.order_id), 'ลบคำสั่งซื้อออกจากระบบแล้ว (ไม่คืนสต็อก)');
  };

  if (state.status === 'loading') return <Spinner label="กำลังโหลดคำสั่งซื้อ…" />;
  if (state.status === 'error') return <ErrorState error={state.error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">คำสั่งซื้อทั้งหมด</h1>
          <p className="mt-1 text-sm text-slate-500">
            ยืนยันการชำระเงิน และอัปเดตสถานะให้นักศึกษามารับของได้
          </p>
        </div>
        <Button tone="outlineNavy" onClick={load}>
          รีเฟรช
        </Button>
      </header>

      <div className="flex flex-wrap gap-2" role="group" aria-label="กรองคำสั่งซื้อ">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              setPendingDelete(null);
            }}
            aria-pressed={tab === t.key}
            className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-jade-500 bg-jade-50 text-jade-700'
                : 'border-hairline bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
            {t.key === 'todo' && todoCount > 0 && (
              <span className="ml-2 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {todoCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {notice && (
        <div className="rounded-xl border border-hairline bg-white px-4 py-3 text-sm">{notice}</div>
      )}

      {pendingDelete && (
        <div
          role="alertdialog"
          aria-label="ยืนยันการลบคำสั่งซื้อ"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5"
        >
          <p className="text-sm font-semibold text-rose-700">
            ลบคำสั่งซื้อ {pendingDelete.order_number} ถาวร?
          </p>
          <p className="mt-1 text-sm text-rose-600">
            คำสั่งซื้อนี้ส่งมอบสินค้าไปแล้ว การลบจะเอารายการสินค้าและประวัติการรับของออกจากฐานข้อมูลด้วย
            และ <strong>จะไม่คืนสต็อก</strong> เพราะสินค้าออกจากร้านไปแล้วจริง — ย้อนกลับไม่ได้
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              tone="rose"
              className="px-3 py-1.5 text-xs"
              disabled={acting === pendingDelete.order_id}
              onClick={confirmDelete}
            >
              ยืนยันลบถาวร
            </Button>
            <Button tone="outlineNavy" className="px-3 py-1.5 text-xs" onClick={() => setPendingDelete(null)}>
              ยกเลิก
            </Button>
          </div>
        </div>
      )}

      <Card>
        {shown.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">
            {tab === 'todo' ? 'ไม่มีคำสั่งซื้อค้างดำเนินการ' : 'ไม่มีคำสั่งซื้อในหมวดนี้'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs text-slate-500">
                  <th className="px-5 py-2.5 font-medium">เลขที่</th>
                  <th className="px-3 py-2.5 font-medium">ผู้สั่งซื้อ</th>
                  <th className="px-3 py-2.5 font-medium">ยอด</th>
                  <th className="px-3 py-2.5 font-medium">รับสินค้า</th>
                  <th className="px-3 py-2.5 font-medium">สลิป</th>
                  <th className="px-3 py-2.5 font-medium">การชำระเงิน</th>
                  <th className="px-3 py-2.5 font-medium">สถานะ</th>
                  <th className="px-5 py-2.5 text-right font-medium">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {shown.map((o) => {
                  const busy = acting === o.order_id;
                  const unpaid = o.payment_status !== 'paid';
                  const isDelivery = o.delivery_method === 'delivery';
                  const editingShipping = shippingFor === o.order_id;

                  return (
                    <Fragment key={o.order_id}>
                    <tr className="hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        <Link href={`/orders/${o.order_id}`} className="font-mono text-xs hover:underline">
                          {o.order_number}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-400">{thaiDateTime(o.created_at)}</p>
                      </td>
                      <td className="px-3 py-3">{o.user?.fullname ?? '—'}</td>
                      <td className="px-3 py-3 font-semibold">{baht(o.total_amount)}</td>
                      <td className="px-3 py-3 text-slate-500">
                        {isDelivery ? 'จัดส่ง' : 'รับที่สาขา'}
                        {isDelivery &&
                          (o.tracking_number ? (
                            <p className="mt-0.5 text-xs">
                              <span className="text-slate-500">{carrierLabel(o.shipping_carrier)}</span>
                              <br />
                              <span className="font-mono text-navy-700">{o.tracking_number}</span>
                            </p>
                          ) : (
                            <p className="mt-0.5 text-xs text-amber-700">ยังไม่มีเลขพัสดุ</p>
                          ))}
                      </td>
                      <td className="px-3 py-3">
                        {o.payment_slip ? (
                          <span
                            className="inline-flex items-center gap-1.5 text-jade-700"
                            title={o.payment_slip}
                          >
                            <Eye className="size-4" />
                            มีสลิป
                          </span>
                        ) : (
                          <span className="text-slate-400">ยังไม่แนบ</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Pill tone={PAYMENT_TONE[o.payment_status] ?? 'slate'}>
                          {PAYMENT_STATUS_TH[o.payment_status] ?? o.payment_status}
                        </Pill>
                      </td>
                      <td className="px-3 py-3">
                        <Pill tone={o.order_status === 'completed' ? 'jade' : 'navy'}>
                          {ORDER_STATUS_TH[o.order_status] ?? o.order_status}
                        </Pill>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {unpaid && (
                            <>
                              <Button
                                tone="jade"
                                className="px-3 py-1.5 text-xs"
                                disabled={busy}
                                onClick={() =>
                                  act(
                                    o,
                                    () => api.setPaymentStatus(o.order_id, 'paid'),
                                    'ยืนยันการชำระเงินแล้ว คำสั่งซื้อถูกยืนยันอัตโนมัติ',
                                  )
                                }
                              >
                                ยืนยันรับเงิน
                              </Button>
                              <Button
                                tone="outlineNavy"
                                className="px-3 py-1.5 text-xs text-rose-600"
                                disabled={busy}
                                onClick={() =>
                                  act(o, () => api.setPaymentStatus(o.order_id, 'rejected'), 'ปฏิเสธการชำระเงินแล้ว')
                                }
                              >
                                ปฏิเสธ
                              </Button>
                            </>
                          )}

                          {isDelivery && (
                            <Button
                              tone={o.tracking_number ? 'outlineNavy' : 'jade'}
                              className="px-3 py-1.5 text-xs"
                              disabled={busy}
                              onClick={() => (editingShipping ? setShippingFor(null) : openShipping(o))}
                            >
                              {editingShipping ? 'ปิดฟอร์ม' : o.tracking_number ? 'แก้เลขพัสดุ' : 'ใส่เลขพัสดุ'}
                            </Button>
                          )}

                          {o.payment_status === 'paid' && !isDelivery && o.order_status !== 'completed' && (
                            <Button
                              tone="outlineJade"
                              className="px-3 py-1.5 text-xs"
                              disabled={busy}
                              onClick={() =>
                                act(
                                  o,
                                  () => api.setOrderStatus(o.order_id, 'ready_for_pickup'),
                                  'เปลี่ยนเป็น พร้อมรับสินค้า แล้ว',
                                )
                              }
                            >
                              แจ้งว่าของพร้อม
                            </Button>
                          )}

                          {isDelivery &&
                            o.payment_status === 'paid' &&
                            o.tracking_number &&
                            o.order_status !== 'completed' && (
                              <Button
                                tone="outlineJade"
                                className="px-3 py-1.5 text-xs"
                                disabled={busy}
                                onClick={() =>
                                  act(
                                    o,
                                    () => api.setOrderStatus(o.order_id, 'completed'),
                                    'ปิดออร์เดอร์แล้ว (ลูกค้าได้รับพัสดุ)',
                                  )
                                }
                              >
                                ลูกค้าได้รับแล้ว
                              </Button>
                            )}

                          {o.order_status === 'completed' && (
                            <>
                              <span className="self-center text-xs text-slate-400">ส่งมอบแล้ว</span>
                              <Button
                                tone="outlineRose"
                                className="px-3 py-1.5 text-xs"
                                disabled={busy}
                                onClick={() => {
                                  setNotice(null);
                                  setPendingDelete(o);
                                }}
                              >
                                ลบ
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* แถวฟอร์มกรอกข้อมูลจัดส่ง — กางอยู่ใต้ออร์เดอร์ที่กำลังแก้ */}
                    {editingShipping && (
                      <tr className="bg-jade-50/50">
                        <td colSpan={8} className="px-5 py-4">
                          <p className="text-sm font-medium">
                            ข้อมูลการจัดส่งของ {o.order_number}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            บันทึกแล้วลูกค้าจะเห็นชื่อขนส่งและเลขพัสดุในหน้าสถานะคำสั่งซื้อทันที
                            พร้อมปุ่มกดไปเช็คพัสดุที่เว็บขนส่ง
                          </p>

                          <div className="mt-3 flex flex-wrap items-end gap-2">
                            <label className="text-xs text-slate-500">
                              บริษัทขนส่ง
                              <select
                                value={shipForm.carrier}
                                onChange={(e) => setShipForm((f) => ({ ...f, carrier: e.target.value }))}
                                aria-label={`บริษัทขนส่งของ ${o.order_number}`}
                                className="mt-1 block w-52 rounded-xl border border-hairline bg-white px-3 py-2 text-sm outline-none focus:border-jade-500"
                              >
                                <option value="">— เลือกบริษัทขนส่ง —</option>
                                {CARRIERS.map((c) => (
                                  <option key={c.code} value={c.code}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="text-xs text-slate-500">
                              เลขติดตามพัสดุ
                              <input
                                value={shipForm.tracking}
                                onChange={(e) => setShipForm((f) => ({ ...f, tracking: e.target.value }))}
                                placeholder="เช่น TH01234567890"
                                aria-label={`เลขพัสดุของ ${o.order_number}`}
                                className="mt-1 block w-60 rounded-xl border border-hairline px-3 py-2 font-mono text-sm outline-none focus:border-jade-500"
                              />
                            </label>

                            <Button
                              tone="jade"
                              className="px-3 py-2 text-xs"
                              disabled={busy}
                              onClick={() => saveShipping(o)}
                            >
                              {busy ? 'กำลังบันทึก…' : 'บันทึกและแจ้งจัดส่ง'}
                            </Button>
                            <Button
                              tone="outlineNavy"
                              className="px-3 py-2 text-xs"
                              onClick={() => setShippingFor(null)}
                            >
                              ยกเลิก
                            </Button>
                            {o.tracking_number && (
                              <Button
                                tone="outlineRose"
                                className="px-3 py-2 text-xs"
                                disabled={busy}
                                onClick={() => {
                                  setShipForm({ carrier: '', tracking: '' });
                                  act(
                                    o,
                                    () =>
                                      api.setShipping(o.order_id, {
                                        shipping_carrier: '',
                                        tracking_number: '',
                                      }),
                                    'ล้างข้อมูลการจัดส่งแล้ว',
                                  ).then(() => setShippingFor(null));
                                }}
                              >
                                ล้างข้อมูลจัดส่ง
                              </Button>
                            )}
                          </div>

                          {trackingUrl(shipForm.carrier, shipForm.tracking) && (
                            <a
                              href={trackingUrl(shipForm.carrier, shipForm.tracking)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-block text-xs font-medium text-jade-700 hover:underline"
                            >
                              ลองเปิดหน้าเช็คพัสดุของ {carrierLabel(shipForm.carrier)} ↗
                            </a>
                          )}

                          <p className="mt-2 text-xs text-slate-400">
                            ใส่เลขพัสดุครั้งแรกจะเปลี่ยนสถานะคำสั่งซื้อเป็น “จัดส่งแล้ว” ให้อัตโนมัติ
                          </p>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
