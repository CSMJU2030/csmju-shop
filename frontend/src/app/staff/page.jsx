'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { baht, ORDER_STATUS_TH, PAYMENT_STATUS_TH, thaiDateTime } from '@/lib/format';
import { Button, Card, ErrorState, Pill, Spinner } from '@/components/ui';

export default function StaffDashboardPage() {
  const [state, setState] = useState({ status: 'loading', summary: null, orders: [], error: null });

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }));
    Promise.all([api.orderSummary(), api.listOrders({ limit: '8' })])
      .then(([s, o]) => setState({ status: 'ready', summary: s.data, orders: o.data, error: null }))
      .catch((error) => setState({ status: 'error', summary: null, orders: [], error }));
  }, []);

  useEffect(load, [load]);

  if (state.status === 'loading') return <Spinner label="กำลังโหลดภาพรวม…" />;
  if (state.status === 'error') return <ErrorState error={state.error} onRetry={load} />;

  const { summary, orders } = state;
  // นับทั้ง pending (ยังไม่แนบสลิป) และ waiting_verify (แนบแล้วรอตรวจ)
  // ทั้งสองแบบคือยังไม่ได้รับเงิน เจ้าหน้าที่ต้องเห็นเท่ากัน
  const countOf = (status) => summary.by_payment_status.find((s) => s.status === status)?.count ?? 0;
  const waiting = countOf('pending') + countOf('waiting_verify');
  const ready = summary.by_order_status.find((s) => s.status === 'ready_for_pickup')?.count ?? 0;

  const tiles = [
    { label: 'คำสั่งซื้อทั้งหมด', value: summary.total_orders, hint: 'ทุกสถานะ' },
    {
      label: 'ยอดขายที่ชำระแล้ว',
      value: baht(summary.total_revenue_paid),
      hint: 'เฉพาะที่ payment_status = paid',
    },
    { label: 'รอยืนยันการชำระเงิน', value: waiting, hint: 'ต้องอนุมัติก่อนจึงรับสินค้าได้' },
    { label: 'พร้อมให้มารับ', value: ready, hint: 'รอนักศึกษามารับที่สาขา' },
  ];

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ภาพรวมร้าน</h1>
          <p className="mt-1 text-sm text-slate-500">ตัวเลขทั้งหมดดึงสดจากฐานข้อมูล csmju_shop</p>
        </div>
        <Button tone="outlineNavy" onClick={load}>
          รีเฟรช
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <p className="text-sm text-slate-500">{t.label}</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{t.value}</p>
            <p className="mt-1 text-xs text-slate-400">{t.hint}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
          <h2 className="font-semibold">คำสั่งซื้อล่าสุด</h2>
          <Link href="/staff/orders" className="text-sm font-medium text-jade-700 hover:underline">
            ดูทั้งหมด
          </Link>
        </div>

        {orders.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">ยังไม่มีคำสั่งซื้อในระบบ</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs text-slate-500">
                  <th className="px-5 py-2.5 font-medium">เลขที่</th>
                  <th className="px-3 py-2.5 font-medium">ผู้สั่งซื้อ</th>
                  <th className="px-3 py-2.5 font-medium">ยอด</th>
                  <th className="px-3 py-2.5 font-medium">การชำระเงิน</th>
                  <th className="px-3 py-2.5 font-medium">สถานะ</th>
                  <th className="px-5 py-2.5 text-right font-medium">เวลา</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {orders.map((o) => (
                  <tr key={o.order_id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3">
                      <Link href={`/orders/${o.order_id}`} className="font-mono text-xs hover:underline">
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="px-3 py-3">{o.user?.fullname ?? '—'}</td>
                    <td className="px-3 py-3 font-semibold">{baht(o.total_amount)}</td>
                    <td className="px-3 py-3">
                      <Pill tone={o.payment_status === 'paid' ? 'jade' : 'amber'}>
                        {PAYMENT_STATUS_TH[o.payment_status] ?? o.payment_status}
                      </Pill>
                    </td>
                    <td className="px-3 py-3">
                      <Pill tone={o.order_status === 'completed' ? 'jade' : 'navy'}>
                        {ORDER_STATUS_TH[o.order_status] ?? o.order_status}
                      </Pill>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-500">{thaiDateTime(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
