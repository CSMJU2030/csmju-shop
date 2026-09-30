'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { baht, thaiDateTime } from '@/lib/format';
import { Button, Card, ErrorState, Pill, Spinner } from '@/components/ui';
import { Box, Chart, Download, Eye, Shield } from '@/components/icons';

/** นับยอดพรีออเดอร์แยกตามชื่อตัวเลือก (ไซส์) จาก order_items ที่เป็นสินค้าพรีออเดอร์ */
function preorderBySize(orders) {
  const tally = new Map();
  for (const o of orders) {
    if (o.order_status === 'cancelled') continue;
    for (const item of o.order_items ?? []) {
      if (!item.is_preorder_item) continue;
      const key = item.variant?.variant_name ?? 'ไม่ระบุ';
      tally.set(key, (tally.get(key) ?? 0) + item.quantity);
    }
  }
  return [...tally.entries()].map(([size, qty]) => ({ size, qty })).sort((a, b) => b.qty - a.qty);
}

/**
 * ยอดขายรายตัวเลือกสินค้า — เอา variants ทั้งหมดมาตั้งต้น
 * แล้วบวกจำนวนที่ขายไปจาก order_items เข้าไป
 * ตั้งต้นจาก variants เพื่อให้สินค้าที่ยังขายไม่ได้เลยก็ยังโผล่ในตาราง (ขายแล้ว 0)
 * ไม่นับออร์เดอร์ที่ถูกยกเลิก เพราะสต็อกถูกคืนไปแล้ว
 */
function salesByVariant(variants, orders) {
  const rows = new Map();

  for (const v of variants) {
    rows.set(v.variant_id, {
      variant_id: v.variant_id,
      variant_name: v.variant_name,
      product_id: v.product?.product_id ?? v.product_id,
      product_name: v.product?.name ?? '—',
      category: v.product?.category ?? '',
      is_preorder: v.product?.is_preorder === true,
      price: Number(v.price),
      stock: v.stock_quantity ?? 0,
      sold: 0,
      revenue: 0,
    });
  }

  for (const o of orders) {
    if (o.order_status === 'cancelled') continue;
    for (const item of o.order_items ?? []) {
      const row = rows.get(item.variant_id);
      if (!row) continue;
      row.sold += item.quantity;
      row.revenue += Number(item.unit_price) * item.quantity;
    }
  }

  // เรียงตามยอดขายมากไปน้อย แล้วจัดกลุ่มตามสินค้าให้อ่านง่าย
  const list = [...rows.values()];
  const productRank = new Map();
  for (const r of list) {
    productRank.set(r.product_id, (productRank.get(r.product_id) ?? 0) + r.sold);
  }

  return list.sort(
    (a, b) =>
      (productRank.get(b.product_id) ?? 0) - (productRank.get(a.product_id) ?? 0) ||
      a.product_id - b.product_id ||
      b.sold - a.sold ||
      a.variant_id - b.variant_id,
  );
}

function downloadCsv(filename, header, rows) {
  const body = [header, ...rows]
    .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function StaffStockPage() {
  const [state, setState] = useState({ status: 'loading', orders: [], variants: [], error: null });
  const [acting, setActing] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }));
    Promise.all([api.listOrders(), api.listVariants()])
      .then(([o, v]) =>
        setState({ status: 'ready', orders: o.data, variants: v.data, error: null }),
      )
      .catch((error) => setState({ status: 'error', orders: [], variants: [], error }));
  }, []);

  useEffect(load, [load]);

  const sizes = useMemo(() => preorderBySize(state.orders), [state.orders]);

  /**
   * คำสั่งซื้อที่ยังต้องให้เจ้าหน้าที่ตัดสินเรื่องเงิน
   * ต้องรวม `pending` (สั่งแล้วแต่ยังไม่แนบสลิป) ด้วย ไม่ใช่เฉพาะ `waiting_verify`
   * ไม่งั้นออร์เดอร์ที่ลูกค้าสั่งโดยไม่แนบสลิปจะหายไปจากระบบเจ้าหน้าที่
   * เรียงให้อันที่มีสลิปแล้วขึ้นก่อน เพราะตรวจได้เลย
   */
  const pending = useMemo(
    () =>
      state.orders
        .filter((o) => o.payment_status === 'pending' || o.payment_status === 'waiting_verify')
        .sort((a, b) => {
          const rank = (o) => (o.payment_status === 'waiting_verify' ? 0 : 1);
          return rank(a) - rank(b) || b.order_id - a.order_id;
        }),
    [state.orders],
  );

  const withSlip = pending.filter((o) => o.payment_status === 'waiting_verify').length;
  const maxQty = Math.max(1, ...sizes.map((s) => s.qty));

  const sales = useMemo(
    () => salesByVariant(state.variants, state.orders),
    [state.variants, state.orders],
  );
  const totalSold = sales.reduce((s, r) => s + r.sold, 0);
  const totalRevenue = sales.reduce((s, r) => s + r.revenue, 0);

  const decide = async (order, approved) => {
    setActing(order.order_id);
    setNotice(null);
    try {
      await api.setPaymentStatus(order.order_id, approved ? 'paid' : 'rejected');
      setNotice(
        `${order.order_number} — ${
          approved ? 'ยืนยันการชำระเงินแล้ว คำสั่งซื้อถูกยืนยันอัตโนมัติ' : 'ปฏิเสธการชำระเงินแล้ว'
        }`,
      );
      load();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setActing(null);
    }
  };

  if (state.status === 'loading') return <Spinner label="กำลังโหลดข้อมูลคำสั่งซื้อ…" />;
  if (state.status === 'error') return <ErrorState error={state.error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">สต็อกและพรีออเดอร์</h1>
          <p className="mt-1 text-sm text-slate-500">
            ดูยอดขายรายสินค้า ยอดที่ต้องสั่งผลิต และตรวจการชำระเงินที่รออนุมัติ
          </p>
        </div>
        <Button
          tone="jade"
          onClick={() =>
            downloadCsv(
              'preorder-summary',
              ['ตัวเลือก', 'จำนวนที่ต้องผลิต'],
              sizes.map((r) => [r.size, r.qty]),
            )
          }
          disabled={sizes.length === 0}
        >
          <Download className="size-4" />
          ส่งออกยอดให้โรงงาน
        </Button>
      </header>

      {notice && (
        <div className="rounded-xl border border-hairline bg-white px-4 py-3 text-sm">{notice}</div>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-3.5">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <Chart className="size-4.5 text-jade-600" />
              ยอดขายรายสินค้า
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              นับจากคำสั่งซื้อที่ยังไม่ถูกยกเลิกทั้งหมด — รวมที่ยังรอยืนยันการชำระเงิน
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone="jade">ขายแล้ว {totalSold} ชิ้น</Pill>
            <Pill tone="navy">{baht(totalRevenue)}</Pill>
            <Button
              tone="outlineNavy"
              className="px-3 py-1.5 text-xs"
              disabled={sales.length === 0}
              onClick={() =>
                downloadCsv(
                  'sales-by-product',
                  ['สินค้า', 'ตัวเลือก', 'หมวดหมู่', 'ราคา', 'ขายแล้ว', 'คงเหลือ', 'ยอดเงิน'],
                  sales.map((r) => [
                    r.product_name,
                    r.variant_name,
                    r.category,
                    r.price,
                    r.sold,
                    r.stock,
                    r.revenue,
                  ]),
                )
              }
            >
              <Download className="size-3.5" />
              ส่งออก CSV
            </Button>
          </div>
        </div>

        {sales.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            ยังไม่มีสินค้าในระบบ — สั่ง npm run seed ที่ฝั่ง backend เพื่อใส่ข้อมูลตัวอย่าง
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs text-slate-500">
                  <th className="px-5 py-2.5 font-medium">สินค้า</th>
                  <th className="px-3 py-2.5 font-medium">ตัวเลือก</th>
                  <th className="px-3 py-2.5 text-right font-medium">ราคา</th>
                  <th className="px-3 py-2.5 text-right font-medium">ขายแล้ว</th>
                  <th className="px-3 py-2.5 text-right font-medium">คงเหลือ</th>
                  <th className="px-5 py-2.5 text-right font-medium">ยอดเงิน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {sales.map((r, i) => {
                  // โชว์ชื่อสินค้าเฉพาะแถวแรกของแต่ละสินค้า ให้อ่านเป็นกลุ่ม
                  const firstOfProduct = i === 0 || sales[i - 1].product_id !== r.product_id;
                  const lowStock = !r.is_preorder && r.stock <= 5;

                  return (
                    <tr key={r.variant_id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        {firstOfProduct ? (
                          <>
                            <span className="font-medium">{r.product_name}</span>
                            <span className="mt-0.5 block text-xs text-slate-400">{r.category}</span>
                          </>
                        ) : (
                          <span className="text-slate-300">〃</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {r.variant_name}
                        {r.is_preorder && (
                          <Pill tone="orchid" className="ml-2">
                            Pre-Order
                          </Pill>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-500 tabular-nums">
                        {baht(r.price)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span
                          className={`font-semibold tabular-nums ${r.sold > 0 ? 'text-jade-700' : 'text-slate-300'}`}
                        >
                          {r.sold}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {r.is_preorder ? (
                          <span className="text-slate-400">ไม่จำกัด</span>
                        ) : (
                          <span className={lowStock ? 'font-semibold text-rose-600' : ''}>
                            {r.stock}
                            {lowStock && <span className="ml-1 text-xs font-normal">ใกล้หมด</span>}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums">
                        {r.revenue > 0 ? baht(r.revenue) : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-5 py-3.5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Box className="size-4.5 text-jade-600" />
            ยอดพรีออเดอร์แยกตามตัวเลือก
          </h2>
          <Pill tone="orchid">ปีการศึกษา 2569</Pill>
        </div>

        {sizes.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            ยังไม่มีคำสั่งซื้อสินค้าพรีออเดอร์ในระบบ
          </p>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {sizes.map(({ size, qty }) => (
              <div key={size} className="rounded-xl border border-hairline p-4 text-center">
                <p className="truncate text-sm text-slate-500" title={size}>
                  {size}
                </p>
                <p className="mt-1 text-3xl font-bold text-jade-700 tabular-nums">{qty}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-orchid-600"
                    style={{ width: `${(qty / maxQty) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card id="slips" className="scroll-mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-5 py-3.5">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <Shield className="size-4.5 text-jade-600" />
              คำสั่งซื้อที่รอตรวจการชำระเงิน
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              รวมทั้งที่แนบสลิปมาแล้วและที่ยังไม่แนบ — ต้องอนุมัติก่อนลูกค้าจึงมารับของได้
            </p>
          </div>
          <Pill tone={pending.length ? 'rose' : 'slate'}>
            รออยู่ {pending.length} รายการ
            {pending.length > 0 && ` (มีสลิป ${withSlip})`}
          </Pill>
        </div>

        {pending.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-slate-600">
              ไม่มีคำสั่งซื้อค้างตรวจการชำระเงิน
            </p>
            <p className="mt-1.5 text-sm text-slate-500">
              {state.orders.length > 0
                ? `ระบบมีคำสั่งซื้อทั้งหมด ${state.orders.length} รายการ — ทุกรายการยืนยันการชำระเงินแล้ว`
                : 'ยังไม่มีคำสั่งซื้อในระบบเลย'}
            </p>
            {state.orders.length > 0 && (
              <Button as={Link} href="/staff/orders" tone="outlineNavy" className="mt-4">
                ดูคำสั่งซื้อทั้งหมด
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs text-slate-500">
                  <th className="px-5 py-2.5 font-medium">เลขที่คำสั่งซื้อ</th>
                  <th className="px-3 py-2.5 font-medium">ผู้สั่งซื้อ</th>
                  <th className="px-3 py-2.5 font-medium">ยอดเงิน</th>
                  <th className="px-3 py-2.5 font-medium">เวลาสั่ง</th>
                  <th className="px-3 py-2.5 font-medium">สถานะสลิป</th>
                  <th className="px-5 py-2.5 text-right font-medium">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {pending.map((o) => (
                  <tr key={o.order_id}>
                    <td className="px-5 py-3 font-mono text-xs">{o.order_number}</td>
                    <td className="px-3 py-3">{o.user?.fullname ?? '—'}</td>
                    <td className="px-3 py-3 font-semibold">{baht(o.total_amount)}</td>
                    <td className="px-3 py-3 text-slate-500">{thaiDateTime(o.created_at)}</td>
                    <td className="px-3 py-3">
                      {o.payment_slip ? (
                        <span
                          className="inline-flex items-center gap-1.5 text-jade-700"
                          title={o.payment_slip}
                        >
                          <Eye className="size-4" />
                          แนบสลิปแล้ว
                        </span>
                      ) : (
                        <Pill tone="amber">ยังไม่แนบสลิป</Pill>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          tone="jade"
                          className="px-3 py-1.5 text-xs"
                          disabled={acting === o.order_id}
                          onClick={() => decide(o, true)}
                        >
                          อนุมัติ
                        </Button>
                        <Button
                          tone="outlineNavy"
                          className="px-3 py-1.5 text-xs text-rose-600"
                          disabled={acting === o.order_id}
                          onClick={() => decide(o, false)}
                        >
                          ปฏิเสธ
                        </Button>
                      </div>
                    </td>
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
