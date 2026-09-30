'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { useSearch } from '@/lib/search';
import { Bag, Bell, Search } from './icons';

export default function ShopHeader() {
  const { count } = useCart();
  const { query, setQuery } = useSearch();

  return (
    <header className="flex items-center gap-3 border-b border-hairline px-4 py-3.5 sm:gap-6 sm:px-6">
      <Link href="/" className="shrink-0 text-lg font-bold tracking-tight text-navy-900">
        CSMJU Shop
      </Link>

      <label className="hidden min-w-0 flex-1 items-center gap-2 rounded-xl border border-hairline px-3 py-2 sm:flex sm:max-w-xs">
        <Search className="size-4 shrink-0 text-slate-400" />
        <span className="sr-only">ค้นหาสินค้า</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาสินค้า"
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </label>

      <nav className="ml-auto flex items-center gap-1">
        <Link
          href="/staff/pickup"
          className="mr-2 hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-navy-50 hover:text-navy-700 sm:block"
        >
          สำหรับเจ้าหน้าที่
        </Link>

        <Link
          href="/checkout"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-navy-50 hover:text-navy-700"
          aria-label={`ตะกร้าสินค้า ${count} ชิ้น`}
        >
          <Bag />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid size-4.5 min-w-4.5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
              {count}
            </span>
          )}
        </Link>

        <span className="rounded-lg p-2 text-slate-400" aria-hidden="true">
          <Bell />
        </span>

        <span className="ml-1 grid size-8 place-items-center rounded-full bg-navy-100 text-xs font-bold text-navy-700">
          สช
        </span>
      </nav>
    </header>
  );
}
