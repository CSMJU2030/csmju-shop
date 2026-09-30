'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bag, Box, Grid, Tag, Truck } from './icons';

const NAV = [
  { href: '/staff', label: 'ภาพรวม', Icon: Grid, exact: true },
  { href: '/staff/orders', label: 'คำสั่งซื้อ', Icon: Bag },
  { href: '/staff/products', label: 'จัดการสินค้า', Icon: Tag },
  { href: '/staff/stock', label: 'สต็อกและพรีออเดอร์', Icon: Box },
  { href: '/staff/pickup', label: 'จุดรับสินค้า', Icon: Truck },
];

export default function StaffNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {NAV.map(({ href, label, Icon, exact, match }) => {
        const target = match ?? href;
        const active =
          target === '__none__' ? false : exact ? pathname === target : pathname.startsWith(target);

        return (
          <Link
            key={label}
            href={href}
            className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? 'bg-jade-50 text-jade-700' : 'text-slate-600 hover:bg-slate-50 hover:text-navy-900'
            }`}
          >
            <Icon className="size-4.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
