import StaffNav from '@/components/StaffNav';
import { Shield } from '@/components/icons';

export const metadata = { title: 'ระบบเจ้าหน้าที่' };

export default function StaffLayout({ children }) {
  return (
    <div className="min-h-screen bg-canvas p-3 sm:p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row">
        <aside className="shrink-0 rounded-2xl border border-hairline bg-white p-3 lg:w-60">
          <div className="mb-4 flex items-center gap-3 px-2 pt-2">
            <span className="grid size-9 place-items-center rounded-xl bg-jade-50 text-jade-700">
              <Shield />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-navy-900">ระบบเจ้าหน้าที่</p>
              <p className="text-xs text-slate-500">CSMJU Admin</p>
            </div>
          </div>

          <StaffNav />

          <div className="mt-6 hidden items-center gap-3 border-t border-hairline px-2 pt-4 lg:flex">
            <span className="grid size-8 place-items-center rounded-full bg-navy-100 text-xs font-bold text-navy-700">
              วช
            </span>
            <div className="leading-tight">
              <p className="text-sm font-medium">วิชัย ดูแลร้าน</p>
              <p className="text-xs text-slate-500">เจ้าหน้าที่</p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
