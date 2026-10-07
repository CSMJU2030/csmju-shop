/**
 * ลิงก์เข้าสู่ระบบ / ออกจากระบบ
 *
 * ระบบย่อยไม่มีหน้า login ของตัวเอง (SEC-05) — ปุ่มเข้าสู่ระบบพาไปที่ SSO launcher ของเว็บ Core Hub
 * ({CORE_HUB_WEB_URL}/api/sso/{SUBSYSTEM_ID}) ซึ่งจะให้ login ที่ Core Hub แล้วส่งกลับมาที่
 * /auth/callback ของ backend พร้อม token (auth-contract.md ข้อ 5)
 */
export const CORE_HUB_WEB_URL = (process.env.NEXT_PUBLIC_CORE_HUB_WEB_URL ?? "http://localhost:3100").replace(/\/+$/, "");
export const SUBSYSTEM_ID = process.env.NEXT_PUBLIC_SUBSYSTEM_ID ?? "csmju-shop";

export const SSO_LOGIN_URL = `${CORE_HUB_WEB_URL}/api/sso/${encodeURIComponent(SUBSYSTEM_ID)}`;
export const CORE_HUB_PORTAL_URL = `${CORE_HUB_WEB_URL}/`;

/** ออกจากระบบร้านค้า (ล้างคุกกี้ของร้าน แล้วกลับไปที่ Core Hub) */
export const LOGOUT_PATH = "/auth/logout";

/** ชื่อคุกกี้ session มาตรฐาน (auth-contract.md ข้อ 5.1) — ตั้งโดย backend ตอน /auth/callback */
export const SESSION_COOKIE = "core_hub_access_token";
