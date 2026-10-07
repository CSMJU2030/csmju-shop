import { NextResponse, type NextRequest } from "next/server";
import { CORE_HUB_PORTAL_URL, SESSION_COOKIE } from "@/lib/auth-links";

/**
 * ออกจากร้านค้า — ล้างคุกกี้ session ของร้าน แล้วพากลับไปที่ Core Hub
 * (การออกจากระบบกลางทำที่ Core Hub · ระบบย่อยไม่ออก/ไม่ยกเลิก token เอง)
 */
export function GET(_request: NextRequest) {
  const response = NextResponse.redirect(CORE_HUB_PORTAL_URL, { status: 303 });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
