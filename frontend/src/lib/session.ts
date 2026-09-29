import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./auth-links";
import type { Me } from "./types";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3002";

/** ใช้ฝั่ง server เท่านั้น (อ่านคุกกี้ผ่าน next/headers)
 *
 * ตัวตนของผู้ใช้ปัจจุบัน (ฝั่ง server) — ถามจาก GET /api/v1/me ของ backend โดยแนบคุกกี้ session ไป
 * backend เป็นผู้ตรวจ token ตามสัญญา หน้าเว็บไม่ตรวจลายเซ็นเอง (SEC-04)
 *
 * คืน null เมื่อยังไม่เข้าสู่ระบบ / session หมดอายุ / บทบาทไม่มีสิทธิ์เข้าร้าน
 */
export async function getCurrentUser(): Promise<{ me: Me | null; status: number }> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return { me: null, status: 401 };

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return { me: null, status: res.status };
    const body = (await res.json()) as { success: boolean; data: Me };
    return { me: body.success ? body.data : null, status: res.status };
  } catch {
    return { me: null, status: 503 };
  }
}
