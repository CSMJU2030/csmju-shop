import { ForbiddenState } from "@/components/shared/states";
import { isStaff } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";

/**
 * ด่านของพื้นที่เจ้าหน้าที่ (/staff/*) — ไม่วาด shell/sidebar เพราะ root layout ครอบ <CsmjuAppShell> ไว้แล้ว
 * ตัดสินแค่ว่าจะ "แสดง" หน้าเจ้าหน้าที่หรือไม่ การบังคับสิทธิ์จริงอยู่ที่ backend เสมอ
 * (ยังไม่เข้าสู่ระบบ → root layout แสดงหน้าเข้าสู่ระบบแทนอยู่แล้ว)
 */
export default async function StaffLayout({ children }: LayoutProps<"/staff">) {
  const { me } = await getCurrentUser();
  if (!me || !isStaff(me.permissions)) return <ForbiddenState />;
  return children;
}
