import { cardClass, primaryButtonClass } from "@/csmju";
import { LockClockIcon } from "./shop-icons";

/**
 * ยังไม่มี session ของร้านค้า — ไม่มีฟอร์ม login ในระบบย่อย (SEC-05)
 * ปุ่มพาไปเข้าสู่ระบบที่ Core Hub แล้ว Core Hub ส่งกลับมาที่ /auth/callback ของร้าน
 */
export function SignInRequired({ loginUrl, unavailable = false }: { loginUrl: string; unavailable?: boolean }) {
  return (
    <div className={`${cardClass} px-6 py-12 text-center`}>
      <LockClockIcon className="mx-auto mb-3 h-10 w-10 text-outline" />
      <h1 className="mb-2 font-display text-headline-md text-on-surface">
        {unavailable ? "เชื่อมต่อระบบร้านค้าไม่ได้" : "เข้าสู่ระบบเพื่อใช้งานร้านค้า"}
      </h1>
      <p className="mx-auto max-w-md text-body-md text-on-surface-variant">
        {unavailable
          ? "ระบบขัดข้องชั่วคราว กรุณาลองอีกครั้งในอีกสักครู่"
          : "ร้านค้า CSMJU Shop ใช้บัญชีเดียวกับ Core Hub ของสาขา เข้าสู่ระบบครั้งเดียวแล้วใช้งานได้ทันที"}
      </p>
      <a href={loginUrl} className={`${primaryButtonClass} mx-auto mt-6 inline-flex`}>
        เข้าสู่ระบบผ่าน Core Hub
      </a>
    </div>
  );
}
