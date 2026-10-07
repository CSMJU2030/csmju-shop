import type { Permission } from './permissions';
import type { SubsystemRole } from './role-mapping';

/** core role ปิดตามสัญญา (auth-contract.md ข้อ 3 · มาตรฐาน 1.0.6) */
export const CORE_ROLES = ['student', 'alumni', 'staff', 'lecturer', 'guest', 'admin'] as const;
export type CoreRole = (typeof CORE_ROLES)[number];

/** claim ที่ผ่านการตรวจลายเซ็นแล้ว — ห้ามคาดหวัง claim อื่นนอกจากนี้ */
export interface VerifiedCoreHubClaims {
  sub: string;
  email: string;
  role: string;
  sid?: string;
  exp: number;
  kid: string;
}

/** ตัวตนของผู้เรียกที่ guard แนบไว้ใน request (อ่านด้วย @CurrentUser()) */
export interface CoreHubIdentity {
  /** Global Identity = claim `sub` (เก็บลงฐานข้อมูลในชื่อ core_user_id) */
  coreUserId: string;
  email: string;
  coreRole: CoreRole;
  subsystemRole: SubsystemRole;
  permissions: readonly Permission[];
  /** เวลาหมดอายุของ token (epoch วินาที) */
  exp: number;
}
