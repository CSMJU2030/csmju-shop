import type { Metadata } from "next";
import { Noto_Sans_Thai, Plus_Jakarta_Sans } from "next/font/google";
import { CsmjuAppShell, type NavItem } from "@/csmju";
import { CartProvider } from "@/lib/cart";
import { LOGOUT_PATH, SSO_LOGIN_URL } from "@/lib/auth-links";
import { isStaff } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { CORE_ROLE_LABEL } from "@/lib/status";
import { SessionProvider } from "@/components/shared/session-context";
import { ToastProvider } from "@/components/shared/toast";
import { SignInRequired } from "@/components/shared/sign-in-required";
import { ForbiddenState } from "@/components/shared/states";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
});

// ต้องตรงกับ display_name ใน subsystem.yaml
const DISPLAY_NAME = "CSMJU Shop";

const CUSTOMER_NAV: NavItem[] = [
  { label: "ร้านค้า", labelEn: "Shop", href: "/", icon: "dashboard" },
  { label: "คำสั่งซื้อของฉัน", labelEn: "My orders", href: "/orders", icon: "receipt" },
];

const STAFF_NAV: NavItem[] = [
  { label: "ภาพรวมร้านค้า", labelEn: "Overview", href: "/staff/overview", icon: "settings" },
  { label: "จัดการคำสั่งซื้อ", labelEn: "Orders", href: "/staff/orders", icon: "description" },
  { label: "จัดการสินค้า", labelEn: "Products", href: "/staff/products", icon: "menu-book" },
  { label: "สต็อกและพรีออเดอร์", labelEn: "Stock", href: "/staff/stock", icon: "event" },
  { label: "จุดรับสินค้า", labelEn: "Pickup", href: "/staff/pickup", icon: "meeting-room" },
];

export const metadata: Metadata = {
  title: {
    template: `%s · ${DISPLAY_NAME} · CSMJU`,
    default: `ร้านค้า · ${DISPLAY_NAME} · CSMJU`,
  },
  description: "ร้านค้าออนไลน์ของสาขาวิชาวิทยาการคอมพิวเตอร์ คณะวิทยาศาสตร์ มหาวิทยาลัยแม่โจ้",
};

// ทุกหน้าขึ้นกับตัวตนของผู้ใช้ — ห้าม cache (design-system.md ข้อ 16.1.1)
export const dynamic = "force-dynamic";

function initialsOf(email: string): string {
  const name = email.split("@")[0] ?? "";
  return (name.slice(0, 2) || "US").toUpperCase();
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { me, status } = await getCurrentUser();

  const nav = me && isStaff(me.permissions) ? [...CUSTOMER_NAV, ...STAFF_NAV] : CUSTOMER_NAV;
  const user = me
    ? { initials: initialsOf(me.email), roleLabel: CORE_ROLE_LABEL[me.coreRole] ?? me.coreRole }
    : { initials: "–", roleLabel: "ยังไม่ได้เข้าสู่ระบบ" };

  let content: React.ReactNode = children;
  if (!me) {
    content =
      status === 403 ? (
        <ForbiddenState message="บทบาทของคุณใน Core Hub ยังไม่มีสิทธิ์เข้าใช้ร้านค้า CSMJU Shop หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบย่อยนี้" />
      ) : (
        <SignInRequired loginUrl={SSO_LOGIN_URL} unavailable={status >= 500} />
      );
  }

  return (
    <html lang="th" className={`${jakarta.variable} ${notoSansThai.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-on-surface">
        <SessionProvider me={me}>
          <ToastProvider>
            <CartProvider>
              <CsmjuAppShell displayName={DISPLAY_NAME} nav={nav} user={user} logoutHref={LOGOUT_PATH}>
                {/* main ของ CsmjuAppShell ไม่มี min-w-0 ตารางกว้างจึงดันทั้งหน้าจนเลื่อนแนวนอน
                    contain:inline-size ทำให้เนื้อหาไม่ขยายความกว้างของ shell (ตารางเลื่อนภายในการ์ดแทน) */}
                <div className="space-y-8 [contain:inline-size]">{content}</div>
              </CsmjuAppShell>
            </CartProvider>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
