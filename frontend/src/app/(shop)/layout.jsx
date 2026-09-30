import ShopHeader from '@/components/ShopHeader';
import { SearchProvider } from '@/lib/search';

export default function ShopLayout({ children }) {
  return (
    <SearchProvider>
      <div className="dotted-field min-h-screen p-3 sm:p-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-white shadow-[0_1px_2px_rgba(20,29,77,.06),0_12px_40px_-12px_rgba(20,29,77,.18)]">
          <ShopHeader />

          {children}

          <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-hairline px-6 py-4 text-xs text-slate-500">
            <span className="font-bold text-navy-900">CSMJU Shop</span>
            <span>© 2026 ร้านค้าสาขาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยแม่โจ้</span>
            <span className="ml-auto hidden gap-5 sm:flex">
              <a href="#about" className="hover:text-navy-700">
                เกี่ยวกับเรา
              </a>
              <a href="#help" className="hover:text-navy-700">
                ศูนย์ช่วยเหลือ
              </a>
              <a href="#terms" className="hover:text-navy-700">
                เงื่อนไขการใช้งาน
              </a>
            </span>
          </footer>
        </div>
      </div>
    </SearchProvider>
  );
}
