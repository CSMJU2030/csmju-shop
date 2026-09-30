'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { baht, thaiDate } from '@/lib/format';
import { useCart } from '@/lib/cart';
import { useSearch } from '@/lib/search';
import { Button, Card, Dot, EmptyState, ErrorState, Pill, Spinner } from '@/components/ui';
import ProductArt from '@/components/ProductArt';
import { Plus } from '@/components/icons';

const FILTERS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'ready', label: 'สินค้าพร้อมส่ง' },
  { key: 'preorder', label: 'เปิด Pre-Order' },
];

const stockOf = (product) => (product.variants ?? []).reduce((s, v) => s + (v.stock_quantity ?? 0), 0);

function priceRange(product) {
  const prices = (product.variants ?? []).map((v) => Number(v.price));
  if (!prices.length) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? baht(min) : `${baht(min)} – ${baht(max)}`;
}

function ProductCard({ product, onAdd }) {
  const isPreorder = product.is_preorder === true;
  const stock = stockOf(product);
  const soldOut = !isPreorder && stock === 0;
  const variants = product.variants ?? [];
  const [variantId, setVariantId] = useState(variants[0]?.variant_id);

  const selected = variants.find((v) => v.variant_id === variantId) ?? variants[0];

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="relative">
        <ProductArt
          name={product.name}
          category={product.category}
          src={product.image_url || undefined}
          className="aspect-4/3"
        />
        <div className="absolute top-3 left-3">
          {isPreorder ? (
            <Pill tone="orchid">
              <Dot />
              Pre-Order
            </Pill>
          ) : soldOut ? (
            <Pill tone="slate">สินค้าหมด</Pill>
          ) : (
            <Pill tone="jade">
              <Dot />
              มีสินค้า
            </Pill>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">{product.category}</p>
        <h3 className="leading-snug font-semibold text-navy-900">{product.name}</h3>

        {isPreorder && (
          <dl className="space-y-1 rounded-xl bg-navy-50 px-3 py-2.5 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">ปิดรับจอง</dt>
              <dd className="font-medium">{thaiDate(product.preorder_end_date)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">คาดว่าได้รับ</dt>
              <dd className="font-medium">{thaiDate(product.estimated_delivery)}</dd>
            </div>
          </dl>
        )}

        {variants.length > 1 && (
          <label className="text-xs text-slate-500">
            ตัวเลือก
            <select
              value={variantId}
              onChange={(e) => setVariantId(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-hairline px-2.5 py-2 text-sm text-navy-900 outline-none focus:border-navy-500"
            >
              {variants.map((v) => (
                <option
                  key={v.variant_id}
                  value={v.variant_id}
                  disabled={!isPreorder && v.stock_quantity === 0}
                >
                  {v.variant_name} · {baht(v.price)}
                  {!isPreorder && v.stock_quantity === 0 ? ' (หมด)' : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <p className="font-semibold text-navy-900">{priceRange(product) ?? '—'}</p>

          {isPreorder ? (
            <Button
              tone="outlineOrchid"
              className="px-3.5 py-2 text-xs"
              disabled={!selected}
              onClick={() => onAdd(selected, product)}
            >
              จองเลย
            </Button>
          ) : (
            <button
              type="button"
              disabled={soldOut || !selected}
              onClick={() => onAdd(selected, product)}
              className="grid size-9 place-items-center rounded-full border border-jade-500 text-jade-700 transition-colors hover:bg-jade-50 disabled:opacity-30"
              aria-label={`เพิ่ม ${product.name} ลงตะกร้า`}
            >
              <Plus className="size-4.5" />
            </button>
          )}
        </div>

        {!isPreorder && !soldOut && <p className="text-xs text-slate-400">คงเหลือ {stock} ชิ้น</p>}
      </div>
    </Card>
  );
}

export default function CatalogPage() {
  const [state, setState] = useState({ status: 'loading', products: [], error: null });
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);
  const { add } = useCart();
  const { query } = useSearch();

  const load = () => {
    setState((s) => ({ ...s, status: 'loading' }));
    api
      .listProducts()
      .then((r) => setState({ status: 'ready', products: r.data, error: null }))
      .catch((error) => setState({ status: 'error', products: [], error }));
  };

  useEffect(load, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.products
      .filter((p) => (filter === 'preorder' ? p.is_preorder : filter === 'ready' ? !p.is_preorder : true))
      .filter((p) => (q ? `${p.name} ${p.category}`.toLowerCase().includes(q) : true));
  }, [state.products, filter, query]);

  const handleAdd = (variant, product) => {
    if (!variant) return;
    add(variant, product);
    setToast(`เพิ่ม ${product.name} — ${variant.variant_name} แล้ว`);
    clearTimeout(handleAdd.t);
    handleAdd.t = setTimeout(() => setToast(null), 2600);
  };

  return (
    <div className="px-4 py-7 sm:px-6 sm:py-9">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">สินค้าประจำสาขา</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            เสื้อผ้าและของที่ระลึกอย่างเป็นทางการของสาขาวิทยาการคอมพิวเตอร์
          </p>
        </div>

        <div className="flex gap-2" role="group" aria-label="กรองสินค้า">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'border-jade-500 bg-jade-50 text-jade-700'
                  : 'border-hairline text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {state.status === 'loading' && <Spinner label="กำลังโหลดสินค้าจากฐานข้อมูล…" />}
      {state.status === 'error' && <ErrorState error={state.error} onRetry={load} />}

      {state.status === 'ready' &&
        (shown.length === 0 ? (
          <EmptyState
            title="ไม่พบสินค้าตามเงื่อนไขนี้"
            hint="ลองเปลี่ยนตัวกรอง หรือสั่ง npm run seed ที่ฝั่ง backend เพื่อใส่ข้อมูลตัวอย่าง"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {shown.map((p) => (
              <ProductCard key={p.product_id} product={p} onAdd={handleAdd} />
            ))}
          </div>
        ))}

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-sm rounded-xl bg-navy-900 px-4 py-3 text-center text-sm font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
