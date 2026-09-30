'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { baht } from '@/lib/format';
import { Button, Card, ErrorState, Pill, Spinner } from '@/components/ui';
import ProductArt from '@/components/ProductArt';

/** แถวตัวเลือกสินค้าเปล่า ๆ — variant_id = null แปลว่ายังไม่เคยบันทึกลงฐานข้อมูล */
const blankVariant = () => ({ variant_id: null, variant_name: '', price: '', stock_quantity: '0' });

const blankForm = () => ({
  product_id: null,
  name: '',
  category: '',
  description: '',
  image_url: '',
  is_preorder: false,
  preorder_end_date: '',
  estimated_delivery: '',
  variants: [blankVariant()],
});

/** แปลงสินค้าจาก API ให้อยู่ในรูปที่ฟอร์มใช้ได้ (ค่าทุกช่องเป็น string เพื่อคุม input) */
function toForm(p) {
  return {
    product_id: p.product_id,
    name: p.name ?? '',
    category: p.category ?? '',
    description: p.description ?? '',
    image_url: p.image_url ?? '',
    is_preorder: Boolean(p.is_preorder),
    preorder_end_date: p.preorder_end_date ? p.preorder_end_date.slice(0, 10) : '',
    estimated_delivery: p.estimated_delivery ? p.estimated_delivery.slice(0, 10) : '',
    variants: (p.variants ?? []).map((v) => ({
      variant_id: v.variant_id,
      variant_name: v.variant_name ?? '',
      price: String(v.price ?? ''),
      stock_quantity: String(v.stock_quantity ?? 0),
    })),
  };
}

const inputClass =
  'w-full rounded-xl border border-hairline px-3 py-2.5 text-sm outline-none focus:border-jade-500';

export default function StaffProductsPage() {
  const [state, setState] = useState({ status: 'loading', products: [], error: null });
  const [form, setForm] = useState(null); // null = ยังไม่ได้เปิดฟอร์ม
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [openStock, setOpenStock] = useState(null); // product_id ที่กางตัวเลือกอยู่
  const fileRef = useRef(null);

  const load = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }));
    api
      .listProducts()
      .then((r) => setState({ status: 'ready', products: r.data, error: null }))
      .catch((error) => setState({ status: 'error', products: [], error }));
  }, []);

  useEffect(load, [load]);

  const categories = useMemo(
    () => [...new Set(state.products.map((p) => p.category).filter(Boolean))],
    [state.products],
  );

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setVariant = (i, key, value) =>
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, idx) => (idx === i ? { ...v, [key]: value } : v)),
    }));

  const openCreate = () => {
    setFormError(null);
    setNotice(null);
    setForm(blankForm());
  };

  const openEdit = async (product) => {
    setFormError(null);
    setNotice(null);
    // ดึงสินค้าทีละตัวเพื่อให้ได้ variants ครบและสดที่สุด
    try {
      const r = await api.getProduct(product.product_id);
      setForm(toForm(r.data));
    } catch (e) {
      setNotice(e.message);
    }
  };

  /** อัปโหลดไฟล์รูปทันทีที่เลือก แล้วเก็บ URL ที่ได้ไว้ในฟอร์ม */
  const pickImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError(null);
    setSaving(true);
    try {
      const r = await api.uploadImage(file);
      setField('image_url', r.data.url);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = ''; // เลือกไฟล์เดิมซ้ำได้
    }
  };

  const validate = (f) => {
    if (!f.name.trim()) return 'ต้องใส่ชื่อสินค้า';
    if (!f.category.trim()) return 'ต้องใส่หมวดหมู่';
    if (f.is_preorder && !f.preorder_end_date) return 'สินค้าพรีออเดอร์ต้องระบุวันปิดรับพรีออเดอร์';

    const rows = f.variants.filter((v) => v.variant_name.trim() || v.price !== '');
    if (rows.length === 0) return 'ต้องมีตัวเลือกสินค้าอย่างน้อย 1 รายการ (เช่น Size M)';
    for (const v of rows) {
      if (!v.variant_name.trim()) return 'ตัวเลือกสินค้าต้องมีชื่อ เช่น Size M';
      if (v.price === '' || Number(v.price) < 0) return `ตัวเลือก "${v.variant_name}" ต้องใส่ราคา`;
    }
    const names = rows.map((v) => v.variant_name.trim());
    if (new Set(names).size !== names.length) return 'ชื่อตัวเลือกสินค้าซ้ำกัน';
    return null;
  };

  const save = async () => {
    const problem = validate(form);
    if (problem) return setFormError(problem);

    setFormError(null);
    setSaving(true);

    const rows = form.variants.filter((v) => v.variant_name.trim() || v.price !== '');
    const body = {
      name: form.name.trim(),
      category: form.category.trim(),
      description: form.description.trim() || undefined,
      image_url: form.image_url || '',
      is_preorder: form.is_preorder,
      preorder_end_date: form.is_preorder && form.preorder_end_date
        ? new Date(form.preorder_end_date).toISOString()
        : undefined,
      estimated_delivery: form.estimated_delivery
        ? new Date(form.estimated_delivery).toISOString()
        : undefined,
    };

    try {
      if (!form.product_id) {
        // สินค้าใหม่ — ส่งตัวเลือกไปพร้อมกันในคำสั่งเดียว
        await api.createProduct({
          ...body,
          variants: rows.map((v) => ({
            variant_name: v.variant_name.trim(),
            price: Number(v.price),
            stock_quantity: Number(v.stock_quantity || 0),
          })),
        });
        setNotice(`เพิ่มสินค้า "${body.name}" แล้ว`);
      } else {
        await api.updateProduct(form.product_id, body);

        // ตัวเลือกต้องจัดการทีละรายการ: ของใหม่ = เพิ่ม, ของเดิม = แก้ไข
        for (const v of rows) {
          const payload = {
            variant_name: v.variant_name.trim(),
            price: Number(v.price),
            stock_quantity: Number(v.stock_quantity || 0),
          };
          if (v.variant_id) await api.updateVariant(v.variant_id, payload);
          else await api.createVariant({ product_id: form.product_id, ...payload });
        }

        // แถวที่ถูกลบออกจากฟอร์ม → ลบออกจากฐานข้อมูลด้วย
        const keep = new Set(rows.map((v) => v.variant_id).filter(Boolean));
        const before = state.products.find((p) => p.product_id === form.product_id);
        for (const v of before?.variants ?? []) {
          if (!keep.has(v.variant_id)) await api.deleteVariant(v.variant_id);
        }

        setNotice(`บันทึกการแก้ไข "${body.name}" แล้ว`);
      }

      setForm(null);
      load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    const p = pendingDelete;
    if (!p) return;
    setPendingDelete(null);
    setNotice(null);
    try {
      await api.deleteProduct(p.product_id);
      if (p.image_url?.startsWith('/uploads/')) {
        await api.deleteImage(p.image_url).catch(() => {
          /* รูปหายไปแล้วก็ไม่เป็นไร */
        });
      }
      setNotice(`ลบสินค้า "${p.name}" แล้ว`);
      load();
    } catch (e) {
      setNotice(e.message);
    }
  };

  /** แก้สต็อกเร็ว ๆ จากหน้ารายการ ไม่ต้องเปิดฟอร์มแก้ไขทั้งสินค้า */
  const saveStock = async (variant, value) => {
    setNotice(null);
    try {
      await api.setStock(variant.variant_id, Number(value));
      setNotice(`อัปเดตสต็อก ${variant.variant_name} เป็น ${value} ชิ้นแล้ว`);
      load();
    } catch (e) {
      setNotice(e.message);
    }
  };

  if (state.status === 'loading') return <Spinner label="กำลังโหลดสินค้า…" />;
  if (state.status === 'error') return <ErrorState error={state.error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">จัดการสินค้า</h1>
          <p className="mt-1 text-sm text-slate-500">
            เพิ่ม แก้ไข ลบสินค้า อัปโหลดรูป และปรับสต็อกของแต่ละตัวเลือก
          </p>
        </div>
        <div className="flex gap-2">
          <Button tone="outlineNavy" onClick={load}>
            รีเฟรช
          </Button>
          <Button tone="jade" onClick={openCreate}>
            + เพิ่มสินค้า
          </Button>
        </div>
      </header>

      {notice && (
        <div className="rounded-xl border border-hairline bg-white px-4 py-3 text-sm">{notice}</div>
      )}

      {pendingDelete && (
        <div
          role="alertdialog"
          aria-label="ยืนยันการลบสินค้า"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5"
        >
          <p className="text-sm font-semibold text-rose-700">ลบสินค้า “{pendingDelete.name}” ถาวร?</p>
          <p className="mt-1 text-sm text-rose-600">
            ตัวเลือกทั้งหมดของสินค้านี้จะถูกลบตามไปด้วย และถ้ามีรูปที่อัปโหลดไว้จะถูกลบออกจากเครื่องด้วย
            — ย้อนกลับไม่ได้ (ถ้าสินค้าเคยถูกสั่งซื้อแล้วระบบจะไม่ยอมให้ลบ)
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button tone="rose" className="px-3 py-1.5 text-xs" onClick={confirmDelete}>
              ยืนยันลบถาวร
            </Button>
            <Button
              tone="outlineNavy"
              className="px-3 py-1.5 text-xs"
              onClick={() => setPendingDelete(null)}
            >
              ยกเลิก
            </Button>
          </div>
        </div>
      )}

      {/* ── ฟอร์มเพิ่ม/แก้ไข ── */}
      {form && (
        <Card className="p-5">
          <h2 className="font-semibold">
            {form.product_id ? `แก้ไขสินค้า #${form.product_id}` : 'เพิ่มสินค้าใหม่'}
          </h2>

          <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr]">
            {/* รูปสินค้า */}
            <div>
              <p className="text-sm font-medium">รูปสินค้า</p>
              <ProductArt
                name={form.name}
                category={form.category}
                src={form.image_url || undefined}
                className="mt-1.5 aspect-square w-full rounded-xl border border-hairline"
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={pickImage}
                aria-label="เลือกไฟล์รูปสินค้า"
                className="mt-2 w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-jade-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-jade-700"
              />
              {form.image_url ? (
                <button
                  type="button"
                  onClick={() => setField('image_url', '')}
                  className="mt-2 text-xs text-rose-600 hover:underline"
                >
                  เอารูปออก
                </button>
              ) : (
                <p className="mt-2 text-xs text-slate-400">
                  ไม่ใส่ก็ได้ — ระบบจะวาดภาพตามหมวดหมู่ให้แทน (รับ JPG PNG WEBP GIF ไม่เกิน 5MB)
                </p>
              )}
            </div>

            {/* ข้อมูลสินค้า */}
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  ชื่อสินค้า
                  <input
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder="เช่น เสื้อโปโลสาขาวิทยาการคอมพิวเตอร์"
                    className={`mt-1.5 font-normal ${inputClass}`}
                  />
                </label>

                <label className="block text-sm font-medium">
                  หมวดหมู่
                  <input
                    value={form.category}
                    onChange={(e) => setField('category', e.target.value)}
                    list="category-list"
                    placeholder="เช่น เสื้อผ้า"
                    className={`mt-1.5 font-normal ${inputClass}`}
                  />
                  <datalist id="category-list">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </label>
              </div>

              <label className="block text-sm font-medium">
                รายละเอียด
                <textarea
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  rows={2}
                  className={`mt-1.5 font-normal ${inputClass}`}
                />
              </label>

              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_preorder}
                  onChange={(e) => setField('is_preorder', e.target.checked)}
                  className="size-4 accent-jade-600"
                />
                เป็นสินค้าพรีออเดอร์ (สั่งได้แม้สต็อกเป็น 0)
              </label>

              {form.is_preorder && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium">
                    ปิดรับพรีออเดอร์วันที่
                    <input
                      type="date"
                      value={form.preorder_end_date}
                      onChange={(e) => setField('preorder_end_date', e.target.value)}
                      className={`mt-1.5 font-normal ${inputClass}`}
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    คาดว่าได้รับของวันที่
                    <input
                      type="date"
                      value={form.estimated_delivery}
                      onChange={(e) => setField('estimated_delivery', e.target.value)}
                      className={`mt-1.5 font-normal ${inputClass}`}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* ตัวเลือกสินค้า + สต็อก */}
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">ตัวเลือกสินค้าและสต็อก</p>
              <Button
                tone="outlineJade"
                className="px-3 py-1.5 text-xs"
                onClick={() => setForm((f) => ({ ...f, variants: [...f.variants, blankVariant()] }))}
              >
                + เพิ่มตัวเลือก
              </Button>
            </div>

            <div className="mt-2 space-y-2">
              {form.variants.map((v, i) => (
                <div key={v.variant_id ?? `new-${i}`} className="flex flex-wrap items-end gap-2">
                  <label className="min-w-[140px] flex-1 text-xs text-slate-500">
                    ชื่อตัวเลือก
                    <input
                      value={v.variant_name}
                      onChange={(e) => setVariant(i, 'variant_name', e.target.value)}
                      placeholder="เช่น Size M"
                      className={`mt-1 ${inputClass}`}
                    />
                  </label>
                  <label className="w-28 text-xs text-slate-500">
                    ราคา (บาท)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={v.price}
                      onChange={(e) => setVariant(i, 'price', e.target.value)}
                      className={`mt-1 ${inputClass}`}
                    />
                  </label>
                  <label className="w-24 text-xs text-slate-500">
                    สต็อก
                    <input
                      type="number"
                      min="0"
                      value={v.stock_quantity}
                      onChange={(e) => setVariant(i, 'stock_quantity', e.target.value)}
                      className={`mt-1 ${inputClass}`}
                    />
                  </label>
                  <Button
                    tone="outlineRose"
                    className="px-3 py-2.5 text-xs"
                    onClick={() =>
                      setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }))
                    }
                  >
                    ลบ
                  </Button>
                </div>
              ))}
              {form.variants.length === 0 && (
                <p className="text-xs text-slate-400">ยังไม่มีตัวเลือก — กด “เพิ่มตัวเลือก” ก่อนบันทึก</p>
              )}
            </div>
          </div>

          {formError && (
            <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
              {formError}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button tone="jade" disabled={saving} onClick={save}>
              {saving ? 'กำลังบันทึก…' : form.product_id ? 'บันทึกการแก้ไข' : 'บันทึกสินค้าใหม่'}
            </Button>
            <Button tone="outlineNavy" disabled={saving} onClick={() => setForm(null)}>
              ยกเลิก
            </Button>
          </div>
        </Card>
      )}

      {/* ── รายการสินค้า ── */}
      <Card>
        {state.products.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">
            ยังไม่มีสินค้าในระบบ — กด “เพิ่มสินค้า” เพื่อเริ่ม
          </p>
        ) : (
          <ul className="divide-y divide-hairline">
            {state.products.map((p) => {
              const variants = p.variants ?? [];
              const prices = variants.map((v) => Number(v.price));
              const stock = variants.reduce((s, v) => s + (v.stock_quantity ?? 0), 0);
              const open = openStock === p.product_id;

              return (
                <li key={p.product_id} className="p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <ProductArt
                      name={p.name}
                      category={p.category}
                      src={p.image_url || undefined}
                      className="size-16 shrink-0 rounded-xl"
                    />

                    <div className="min-w-[180px] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{p.name}</p>
                        {p.is_preorder && <Pill tone="orchid">พรีออเดอร์</Pill>}
                        {p.image_url ? null : <Pill tone="slate">ยังไม่มีรูป</Pill>}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {p.category} · {variants.length} ตัวเลือก ·{' '}
                        {prices.length
                          ? prices.length > 1 && Math.min(...prices) !== Math.max(...prices)
                            ? `${baht(Math.min(...prices))}–${baht(Math.max(...prices))}`
                            : baht(prices[0])
                          : 'ยังไม่ตั้งราคา'}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-500">สต็อกรวม</p>
                      <p className={`font-semibold tabular-nums ${stock <= 5 ? 'text-rose-600' : ''}`}>
                        {p.is_preorder ? 'ไม่จำกัด' : stock}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        tone="outlineNavy"
                        className="px-3 py-1.5 text-xs"
                        onClick={() => setOpenStock(open ? null : p.product_id)}
                      >
                        {open ? 'ปิดสต็อก' : 'แก้สต็อกเร็ว'}
                      </Button>
                      <Button
                        tone="outlineJade"
                        className="px-3 py-1.5 text-xs"
                        onClick={() => openEdit(p)}
                      >
                        แก้ไข
                      </Button>
                      <Button
                        tone="outlineRose"
                        className="px-3 py-1.5 text-xs"
                        onClick={() => {
                          setNotice(null);
                          setPendingDelete(p);
                        }}
                      >
                        ลบ
                      </Button>
                    </div>
                  </div>

                  {open && (
                    <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3">
                      {variants.length === 0 && (
                        <p className="text-sm text-slate-500">สินค้านี้ยังไม่มีตัวเลือก — กด “แก้ไข” เพื่อเพิ่ม</p>
                      )}
                      {variants.map((v) => (
                        <StockRow key={v.variant_id} variant={v} onSave={saveStock} />
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

/** หนึ่งบรรทัดสำหรับแก้สต็อกของตัวเลือกเดียว — เก็บค่าที่พิมพ์ไว้ในตัวเองจนกว่าจะกดบันทึก */
function StockRow({ variant, onSave }) {
  const [value, setValue] = useState(String(variant.stock_quantity ?? 0));
  const [busy, setBusy] = useState(false);
  const changed = String(variant.stock_quantity ?? 0) !== value;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="min-w-[120px] flex-1 font-medium">{variant.variant_name}</span>
      <span className="text-slate-500">{baht(variant.price)}</span>
      <input
        type="number"
        min="0"
        value={value}
        aria-label={`สต็อกของ ${variant.variant_name}`}
        onChange={(e) => setValue(e.target.value)}
        className="w-24 rounded-xl border border-hairline px-3 py-1.5 text-sm outline-none focus:border-jade-500"
      />
      <Button
        tone="jade"
        className="px-3 py-1.5 text-xs"
        disabled={!changed || busy}
        onClick={async () => {
          setBusy(true);
          await onSave(variant, value);
          setBusy(false);
        }}
      >
        บันทึก
      </Button>
    </div>
  );
}
