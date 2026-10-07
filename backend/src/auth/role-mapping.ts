import type { CoreRole } from './core-hub-identity';

/**
 * Role mapping: core role (Layer 1) → subsystem role (Layer 2)
 *
 * ⚠️ ตารางนี้ต้องตรงกับ `defaultRoleMapping` ที่ลงทะเบียนไว้ใน Core Hub **เป๊ะ**
 *    key ของตาราง = core role ที่เข้าระบบร้านค้าได้ (authorization.md ข้อ 3)
 *
 * - `lecturer` · `guest` (เพิ่มในมาตรฐาน 1.0.6) ยังไม่เปิดให้เข้า — ผู้ใช้ role นั้นได้ 403
 *   จะเปิดเมื่อ Core Hub รองรับ role ใหม่แล้ว โดยแก้ทั้งตารางนี้และทะเบียนพร้อมกัน
 */
export const CORE_ROLE_TO_SUBSYSTEM_ROLE = {
  student: 'STUDENT',
  alumni: 'ALUMNI',
  staff: 'STAFF',
  admin: 'ADMIN',
} as const satisfies Partial<Record<CoreRole, string>>;

export type SubsystemRole =
  (typeof CORE_ROLE_TO_SUBSYSTEM_ROLE)[keyof typeof CORE_ROLE_TO_SUBSYSTEM_ROLE];

/** แปลง core role เป็น subsystem role · คืน null = role นี้เข้าระบบไม่ได้ (→ 403) */
export function mapCoreRole(coreRole: string): SubsystemRole | null {
  const key = coreRole.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(CORE_ROLE_TO_SUBSYSTEM_ROLE, key)
    ? CORE_ROLE_TO_SUBSYSTEM_ROLE[key as keyof typeof CORE_ROLE_TO_SUBSYSTEM_ROLE]
    : null;
}
