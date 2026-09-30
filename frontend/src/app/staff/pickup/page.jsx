'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { baht, PAYMENT_STATUS_TH } from '@/lib/format';
import { Button, Card, Pill } from '@/components/ui';
import { CheckCircle, QrIcon, Search } from '@/components/icons';
import QrScanner from '@/components/QrScanner';

/**
 * ดึงรหัสรับสินค้าออกจากข้อความใน QR
 * บัตรของนักศึกษาเก็บ pickup_code ตรง ๆ อยู่แล้ว แต่เผื่อวันหลังเปลี่ยนไปใส่เป็นลิงก์
 * จึงมองหารูปแบบ PICKUP-XXXX ในข้อความก่อน ถ้าไม่เจอค่อยใช้ทั้งก้อน
 */
function extractPickupCode(text) {
  return (text.match(/PICKUP-[A-Z0-9-]+/i)?.[0] ?? text).trim().toUpperCase();
}

export default function StaffPickupPage() {
  const [code, setCode] = useState('');
  const [staff, setStaff] = useState([]);
  const [staffId, setStaffId] = useState('');
  const [result, setResult] = useState(null);
  const [notes, setNotes] = useState('');
  const [idChecked, setIdChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  /** รหัสล่าสุดที่กล้องอ่านได้ — ไว้ยืนยันกับเจ้าหน้าที่ว่าสแกนติดแล้ว */
  const [scanned, setScanned] = useState(null);

  useEffect(() => {
    Promise.all([api.listUsers({ role: 'staff' }), api.listUsers({ role: 'admin' })])
      .then(([a, b]) => {
        const all = [...a.data, ...b.data];
        setStaff(all);
        setStaffId(String(all[0]?.user_id ?? ''));
      })
      .catch(() => setStaff([]));
  }, []);

  /** ค้นหาออร์เดอร์จากรหัส — รับค่าจากช่องพิมพ์ หรือจากกล้องที่สแกนเจอ */
  const lookup = async (e, fromScan) => {
    e?.preventDefault();
    const value = (fromScan ?? code).trim();

    setError(null);
    setDone(null);
    setResult(null);
    setIdChecked(false);
    if (!fromScan) setScanned(null); // ค้นด้วยการพิมพ์เอง → ล้างผลสแกนเก่าทิ้ง
    if (!value) return;

    setBusy(true);
    try {
      const r = await api.verifyPickup(value);
      setResult(r.data);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  /** กล้องอ่าน QR ได้ — เติมรหัสลงช่องแล้วค้นหาให้เลย เจ้าหน้าที่ไม่ต้องกดอะไรอีก */
  const onScan = (text) => {
    const found = extractPickupCode(text);
    setScanned(found);
    setCode(found);
    lookup(null, found);
  };

  const confirm = async () => {
    setError(null);
    setBusy(true);
    try {
      const r = await api.createPickupLog({
        pickup_code: result.order.pickup_code,
        staff_id: Number(staffId),
        notes: notes.trim() || undefined,
      });
      setDone(r.data);
      setResult(null);
      setCode('');
      setNotes('');
      setScanned(null);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const order = result?.order;
  const canConfirm = result?.valid && !result?.already_picked_up && idChecked && staffId;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">จุดตรวจรับสินค้า</h1>
        <p className="mt-1 text-sm text-slate-500">
          กรอกรหัสรับสินค้าจากบัตรดิจิทัลของนักศึกษา เพื่อตรวจสอบและบันทึกการส่งมอบ
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── ซ้าย: ช่องรับรหัส ── */}
        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <QrIcon className="size-5 text-jade-600" />
            รับรหัสจากลูกค้า
          </h2>

          <QrScanner onDetect={onScan} disabled={busy} />

          {scanned && (
            <p className="mt-2 rounded-xl bg-jade-50 px-3.5 py-2.5 text-sm text-jade-700">
              สแกนได้รหัส <span className="font-mono font-semibold">{scanned}</span>
              {busy && ' — กำลังตรวจสอบ…'}
            </p>
          )}

          <form onSubmit={lookup} className="mt-4">
            <label htmlFor="pickup-code" className="text-sm font-medium">
              รหัสรับสินค้า
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="pickup-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="เช่น PICKUP-88421"
                className="min-w-0 flex-1 rounded-xl border border-hairline px-3 py-2.5 font-mono text-sm outline-none focus:border-jade-500"
              />
              <Button tone="jade" type="submit" disabled={busy || !code.trim()}>
                <Search className="size-4" />
                ค้นหา
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              รหัสอยู่บนบัตรรับสินค้าของนักศึกษา และในผลลัพธ์ตอนสั่งซื้อ
            </p>
          </form>

          <label className="mt-5 block text-sm font-medium">
            เจ้าหน้าที่ผู้ส่งมอบ
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-hairline px-3 py-2.5 text-sm outline-none focus:border-jade-500"
            >
              {staff.length === 0 && <option value="">— ไม่พบเจ้าหน้าที่ในฐานข้อมูล —</option>}
              {staff.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.fullname} ({u.role})
                </option>
              ))}
            </select>
          </label>
        </Card>

        {/* ── ขวา: ผลการตรวจสอบ ── */}
        <Card className="flex flex-col p-5">
          {done && (
            <div className="rounded-xl bg-jade-50 p-5 text-center">
              <CheckCircle className="mx-auto size-9 text-jade-600" />
              <p className="mt-2 font-semibold text-jade-700">บันทึกการส่งมอบแล้ว</p>
              <p className="mt-1 text-sm text-slate-600">
                {done.order?.order_number} · เปลี่ยนสถานะเป็น สำเร็จ เรียบร้อย
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-rose-50 p-4">
              <p className="font-medium text-rose-700">{error.message}</p>
            </div>
          )}

          {!order && !done && !error && (
            <div className="grid flex-1 place-items-center py-16 text-center">
              <div>
                <QrIcon className="mx-auto size-8 text-slate-300" />
                <p className="mt-3 text-sm text-slate-500">ยังไม่มีรายการ — กรอกรหัสทางซ้ายก่อน</p>
              </div>
            </div>
          )}

          {order && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {result.already_picked_up ? (
                  <Pill tone="amber">รับสินค้าไปแล้ว</Pill>
                ) : result.valid ? (
                  <Pill tone="jade">พร้อมส่งมอบ</Pill>
                ) : (
                  <Pill tone="rose">ยังส่งมอบไม่ได้</Pill>
                )}
                <span className="font-mono text-sm text-slate-500">{order.order_number}</span>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-navy-100 font-bold text-navy-700">
                  {order.user?.fullname?.slice(0, 1) ?? '?'}
                </span>
                <div className="leading-tight">
                  <p className="font-semibold">{order.user?.fullname}</p>
                  <p className="text-sm text-slate-500">
                    รหัสนักศึกษา {order.user?.student_id ?? '—'} · {order.user?.phone ?? '—'}
                  </p>
                </div>
              </div>

              <p className="mt-5 mb-2 text-sm font-medium">
                รายการสินค้า ({(order.order_items ?? []).length})
              </p>
              <ul className="space-y-2">
                {(order.order_items ?? []).map((it) => (
                  <li
                    key={it.item_id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-hairline px-3.5 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{it.variant?.product?.name}</span>
                      <span className="text-xs text-slate-500">{it.variant?.variant_name}</span>
                    </span>
                    <span className="shrink-0 rounded-lg bg-jade-50 px-2.5 py-1 text-sm font-semibold text-jade-700">
                      ×{it.quantity}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">ยอดรวม</dt>
                  <dd className="font-semibold">{baht(order.total_amount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">การชำระเงิน</dt>
                  <dd>{PAYMENT_STATUS_TH[order.payment_status] ?? order.payment_status}</dd>
                </div>
              </dl>

              {result.valid && !result.already_picked_up && (
                <>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="หมายเหตุ (ไม่บังคับ)"
                    className="mt-4 w-full rounded-xl border border-hairline px-3 py-2.5 text-sm outline-none focus:border-jade-500"
                  />

                  <label className="mt-3 flex items-center gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={idChecked}
                      onChange={(e) => setIdChecked(e.target.checked)}
                      className="size-4 accent-jade-600"
                    />
                    ตรวจบัตรนักศึกษาตรงกับชื่อผู้สั่งซื้อแล้ว
                  </label>

                  <Button
                    tone="jade"
                    className="mt-4 w-full py-3"
                    disabled={!canConfirm || busy}
                    onClick={confirm}
                  >
                    <CheckCircle className="size-4.5" />
                    {busy ? 'กำลังบันทึก…' : 'ยืนยันการส่งมอบสินค้า'}
                  </Button>
                </>
              )}

              {!result.valid && (
                <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
                  ส่งมอบไม่ได้เพราะสถานะการชำระเงินคือ{' '}
                  {PAYMENT_STATUS_TH[order.payment_status] ?? order.payment_status} — ต้องอนุมัติสลิปที่หน้า
                  สต็อกและพรีออเดอร์ ก่อน
                </p>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
