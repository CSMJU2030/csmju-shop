import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SSO_LOGIN_URL } from "@/lib/auth-links";

/**
 * ด่านหน้าของทุกหน้าเว็บ: ไม่มี session หรือ session หมดอายุ → วิ่ง SSO ใหม่ที่ Core Hub ทันที
 * (auth-contract.md ข้อ 7 — v1.0 ต่ออายุด้วยการวิ่ง sso/authorize ใหม่)
 *
 * อ่านแค่ `exp` เพื่อตัดสินการนำทาง ไม่ได้ตรวจลายเซ็น — backend ตรวจ token ครบ 8 ขั้นทุกคำขออยู่แล้ว
 */
function expired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token && !expired(token)) return NextResponse.next();

  // คำขอที่เบราว์เซอร์ prefetch ไม่ต้องพาออกไป
  if (request.headers.get("next-router-prefetch")) return NextResponse.next();

  const response = NextResponse.redirect(SSO_LOGIN_URL, { status: 307 });
  if (token) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  // เว้น API (backend ตอบ 401 JSON เอง) · ไฟล์ static · รูปสินค้า · ออกจากระบบ
  matcher: ["/((?!api/|uploads/|auth/|_next/|favicon.ico|csmju-logo.png).*)"],
};
