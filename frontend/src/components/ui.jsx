/** ชิ้นส่วน UI ที่ใช้ซ้ำทั้งสองฝั่ง — ไม่มี state จึงเป็น server component ได้ */

export function Card({ className = '', children, ...rest }) {
  return (
    <div className={`rounded-2xl border border-hairline bg-white ${className}`} {...rest}>
      {children}
    </div>
  );
}

const PILL = {
  jade: 'bg-jade-50 text-jade-700',
  orchid: 'bg-orchid-50 text-orchid-700',
  navy: 'bg-navy-100 text-navy-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
  slate: 'bg-slate-100 text-slate-600',
};

export function Pill({ tone = 'slate', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${PILL[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Dot({ className = '' }) {
  return <span className={`size-1.5 rounded-full bg-current ${className}`} aria-hidden="true" />;
}

const BTN = {
  navy: 'bg-navy-900 text-white hover:bg-navy-950 disabled:bg-navy-200',
  jade: 'bg-jade-600 text-white hover:bg-jade-700 disabled:bg-jade-100 disabled:text-jade-600',
  outlineJade: 'border border-jade-500 text-jade-700 hover:bg-jade-50 disabled:opacity-40',
  outlineOrchid: 'border border-orchid-600 text-orchid-700 hover:bg-orchid-50 disabled:opacity-40',
  outlineNavy: 'border border-navy-200 text-navy-700 hover:bg-navy-50 disabled:opacity-40',
  rose: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-200',
  outlineRose: 'border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-40',
  ghost: 'text-navy-700 hover:bg-navy-50',
};

export function Button({ tone = 'navy', className = '', as: As = 'button', ...rest }) {
  return (
    <As
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${BTN[tone]} ${className}`}
      {...rest}
    />
  );
}

export function Spinner({ label = 'กำลังโหลด…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
      <span className="size-4 animate-spin rounded-full border-2 border-navy-200 border-t-navy-700" />
      {label}
    </div>
  );
}

/** แสดงเมื่อยิง API ไม่สำเร็จ — บอกว่าเกิดอะไรและทำอะไรต่อได้ */
export function ErrorState({ error, onRetry }) {
  return (
    <Card className="p-6">
      <p className="font-semibold text-rose-700">{error?.message || 'เกิดข้อผิดพลาด'}</p>
      {error?.status === 0 && (
        <p className="mt-2 text-sm text-slate-600">
          เปิด backend ด้วย <code className="rounded bg-slate-100 px-1.5 py-0.5">npm run dev</code> ที่โฟลเดอร์
          csmju-shop แล้วลองใหม่
        </p>
      )}
      {onRetry && (
        <Button tone="outlineNavy" className="mt-4" onClick={onRetry}>
          ลองใหม่
        </Button>
      )}
    </Card>
  );
}

export function EmptyState({ title, hint, action }) {
  return (
    <Card className="p-10 text-center">
      <p className="font-semibold">{title}</p>
      {hint && <p className="mt-1.5 text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </Card>
  );
}
