'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { baht } from '@/lib/format';
import { useCart } from '@/lib/cart';
import { CUSTOMERS, customerFields } from '@/lib/identities';
import { Button, Card, EmptyState, Pill, Spinner } from '@/components/ui';
import ProductArt from '@/components/ProductArt';
import { ArrowLeft, CheckCircle, Lock, MapPin, Trash, Truck, Upload } from '@/components/icons';

const SHIPPING_FEE = 50;

export default function CheckoutPage() {
  const { lines, setQuantity, remove, subtotal, clear, ready } = useCart();
  const router = useRouter();

  const [customerId, setCustomerId] = useState(CUSTOMERS[0].core_user_id);
  const [method, setMethod] = useState('pickup');
  const [address, setAddress] = useState('');
  const [slipName, setSlipName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const shipping = method === 'delivery' ? SHIPPING_FEE : 0;
  const total = subtotal + shipping;

  const onPickFile = (file) => {
    if (!file) return;
    // schema เก็บ payment_slip เป็นข้อความ (VARCHAR 255) จึงส่งเป็นชื่อไฟล์ไปก่อน
    // ถ้าจะอัปโหลดไฟล์จริงต้องเพิ่ม endpoint รับไฟล์ที่ฝั่ง NestJS
    setSlipName(`slips/${Date.now()}_${file.name}`.slice(0, 250));
  };

  const submit = async () => {
    setError(null);
    const customer = CUSTOMERS.find((c) => c.core_user_id === customerId);
    if (!customer) return setError(new Error('เลือกผู้สั่งซื้อก่อน'));
    if (method === 'delivery' && !address.trim()) return setError(new Error('การจัดส่งต้องระบุที่อยู่'));

    setSubmitting(true);
    try {
      const created = await api.createOrder({
        ...customerFields(customer),
        delivery_method: method,
        ...(method === 'delivery'
          ? { shipping_fee: SHIPPING_FEE, shipping_address: address.trim() }
          : {}),
        ...(slipName ? { payment_slip: slipName } : {}),
        items: lines.map((l) => ({ variant_id: l.variant_id, quantity: l.quantity })),
      });

      clear();
      router.push(`/orders/${created.data.order_id}`);
    } catch (e) {
      setError(e);
      setSubmitting(false);
    }
  };

  // รอให้อ่านตะกร้าจาก localStorage เสร็จก่อน ไม่งั้นจะเห็น "ตะกร้าว่าง" แวบหนึ่ง
  if (!ready) return <Spinner label="กำลังเปิดตะกร้า…" />;

  if (lines.length === 0) {
    return (
      <div className="px-4 py-12 sm:px-6">
        <EmptyState
          title="ยังไม่มีสินค้าในตะกร้า"
          hint="เลือกสินค้าจากหน้าแรกแล้วกลับมาที่นี่"
          action={
            <Button as={Link} href="/" tone="navy">
              ไปเลือกสินค้า
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="px-4 py-7 sm:px-6 sm:py-9">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy-700"
      >
        <ArrowLeft className="size-4" />
        กลับไปเลือกสินค้า
      </Link>

      <h1 className="mt-4 mb-6 text-2xl font-bold tracking-tight sm:text-3xl">ยืนยันคำสั่งซื้อ</h1>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* ── ซ้าย: รายการและวิธีรับสินค้า ── */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
              <h2 className="font-semibold">รายการสินค้า</h2>
              <Pill tone="navy">{lines.length} รายการ</Pill>
            </div>

            <ul className="divide-y divide-hairline">
              {lines.map((l) => (
                <li key={l.variant_id} className="flex gap-4 p-4">
                  <ProductArt
                    name={l.product_name}
                    category={l.category}
                    src={l.image_url || undefined}
                    className="size-20 shrink-0 rounded-xl"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-navy-900">{l.product_name}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{l.variant_name}</p>
                    <div className="mt-2">
                      {l.is_preorder ? (
                        <Pill tone="orchid">Pre-Order</Pill>
                      ) : (
                        <Pill tone="jade">พร้อมส่ง</Pill>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between gap-2">
                    <p className="font-semibold">{baht(l.price * l.quantity)}</p>
                    <div className="flex items-center gap-1.5">
                      <label className="sr-only" htmlFor={`qty-${l.variant_id}`}>
                        จำนวน {l.product_name}
                      </label>
                      <input
                        id={`qty-${l.variant_id}`}
                        type="number"
                        min={1}
                        value={l.quantity}
                        onChange={(e) => setQuantity(l.variant_id, Number(e.target.value))}
                        className="w-16 rounded-lg border border-hairline px-2 py-1.5 text-right text-sm outline-none focus:border-navy-500"
                      />
                      <button
                        type="button"
                        onClick={() => remove(l.variant_id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`เอา ${l.product_name} ออก`}
                      >
                        <Trash className="size-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="border-b border-hairline px-5 py-3.5 font-semibold">วิธีรับสินค้า</h2>

            <div className="space-y-3 p-4">
              <label
                className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${
                  method === 'pickup'
                    ? 'border-jade-500 bg-jade-50/50'
                    : 'border-hairline hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="delivery_method"
                  checked={method === 'pickup'}
                  onChange={() => setMethod('pickup')}
                  className="mt-1 accent-jade-600"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">มารับเองที่ห้องสาขา</p>
                    <span className="text-sm font-semibold text-jade-700">ไม่มีค่าใช้จ่าย</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    รับสินค้าที่ห้องพักสาขา ระบบจะแจ้งเมื่อของพร้อม
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs text-slate-600">
                    <MapPin className="size-3.5 text-jade-600" />
                    ห้อง 204 อาคาร IT · จันทร์–ศุกร์ 09:00–16:00
                  </p>
                </div>
              </label>

              <label
                className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${
                  method === 'delivery'
                    ? 'border-jade-500 bg-jade-50/50'
                    : 'border-hairline hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="delivery_method"
                  checked={method === 'delivery'}
                  onChange={() => setMethod('delivery')}
                  className="mt-1 accent-jade-600"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex items-center gap-2 font-medium">
                      <Truck className="size-4 text-slate-400" />
                      จัดส่งตามที่อยู่
                    </p>
                    <span className="text-sm font-semibold">+{baht(SHIPPING_FEE)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">ส่งแบบลงทะเบียน ใช้เวลา 3–5 วันทำการ</p>

                  {method === 'delivery' && (
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={3}
                      placeholder="บ้านเลขที่ หมู่ ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
                      className="mt-3 w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm outline-none focus:border-navy-500"
                    />
                  )}
                </div>
              </label>
            </div>
          </Card>

          <Card className="p-4">
            <label className="block text-sm font-medium">
              ผู้สั่งซื้อ
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-hairline px-3 py-2.5 text-sm outline-none focus:border-navy-500"
              >
                {CUSTOMERS.map((c) => (
                  <option key={c.core_user_id} value={c.core_user_id}>
                    {c.name} {c.student_id ? `(${c.student_id})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-2 text-xs text-slate-500">
              ตัวตนทดสอบ — เมื่อเชื่อม Core Hub แล้วระบบจะใช้ผู้ที่ล็อกอินอยู่แทน
            </p>
          </Card>
        </div>

        {/* ── ขวา: ยอดชำระ ── */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="overflow-hidden">
            <h2 className="border-b border-hairline px-5 py-3.5 font-semibold">สรุปยอดชำระ</h2>

            <div className="bg-linear-to-br from-navy-900 via-navy-700 to-orchid-600 px-5 py-5 text-white">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-white/70">ราคาสินค้า</dt>
                  <dd>{baht(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-white/70">ค่าจัดส่ง</dt>
                  <dd>{baht(shipping)}</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-white/20 pt-3">
                  <dt className="font-medium">ยอดที่ต้องชำระ</dt>
                  <dd className="text-2xl font-bold">{baht(total)}</dd>
                </div>
              </dl>

              <div className="mt-5 flex flex-col items-center gap-2">
                <p className="text-xs text-white/70">สแกนจ่ายผ่าน PromptPay</p>
                <div className="grid size-28 place-items-center rounded-xl bg-white/95">
                  <span className="text-[10px] font-medium text-navy-700">QR PromptPay</span>
                </div>
                <p className="text-xs text-white/80">กองทุนสาขาวิทยาการคอมพิวเตอร์</p>
              </div>
            </div>

            <div className="p-4">
              <p className="mb-2 text-sm font-medium">
                แนบสลิปโอนเงิน <span className="text-slate-400">(ไม่บังคับ)</span>
              </p>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed border-hairline px-4 py-6 text-center transition-colors hover:border-navy-500 hover:bg-navy-50/50"
              >
                <Upload className="size-6 text-slate-400" />
                <span className="text-sm font-medium text-navy-700">
                  {slipName ? 'เปลี่ยนไฟล์สลิป' : 'เลือกไฟล์สลิป'}
                </span>
                <span className="text-xs text-slate-400">JPG หรือ PNG ไม่เกิน 5MB</span>
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg"
                className="sr-only"
                onChange={(e) => onPickFile(e.target.files?.[0])}
              />

              {slipName && (
                <p className="mt-2 truncate text-xs text-jade-700">
                  แนบแล้ว: {slipName.split('_').slice(1).join('_')}
                </p>
              )}

              {error && (
                <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error.message}
                </p>
              )}

              <Button
                tone="navy"
                className="mt-4 w-full py-3"
                onClick={submit}
                disabled={submitting || !customerId}
              >
                <CheckCircle className="size-4.5" />
                {submitting ? 'กำลังบันทึก…' : 'ยืนยันคำสั่งซื้อ'}
              </Button>

              <p className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <Lock className="size-3.5" />
                ระบบจะตัดสต็อกและออกรหัสรับสินค้าให้อัตโนมัติ
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
