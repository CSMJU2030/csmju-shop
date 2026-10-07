import type { SubsystemRole } from './role-mapping';

/**
 * Permission ของร้านค้า — รูปแบบ <resource>:<action>[:own|:any] (authorization.md ข้อ 4)
 * เมทริกซ์ทั้งหมดอยู่ที่ไฟล์นี้ที่เดียว
 *
 * ":own" = เฉพาะข้อมูลที่ record.core_user_id === token.sub (service ตรวจกับข้อมูลจริงอีกชั้น)
 */
export enum Permission {
  PRODUCT_READ = 'product:read',
  PRODUCT_CREATE = 'product:create',
  PRODUCT_UPDATE = 'product:update',
  PRODUCT_DELETE = 'product:delete',

  STOCK_UPDATE = 'stock:update',

  ORDER_CREATE_OWN = 'order:create:own',
  ORDER_READ_OWN = 'order:read:own',
  ORDER_READ_ANY = 'order:read:any',
  /** แนบสลิปของคำสั่งซื้อตัวเอง */
  ORDER_UPDATE_OWN = 'order:update:own',
  /** เปลี่ยนสถานะ · ตรวจสลิป · ใส่เลขพัสดุ · แก้รายการสินค้า */
  ORDER_UPDATE_ANY = 'order:update:any',
  ORDER_DELETE_ANY = 'order:delete:any',

  PICKUP_READ = 'pickup:read',
  PICKUP_CREATE = 'pickup:create',
  PICKUP_DELETE = 'pickup:delete',

  REPORT_READ = 'report:read',
}

const CUSTOMER: readonly Permission[] = [
  Permission.PRODUCT_READ,
  Permission.ORDER_CREATE_OWN,
  Permission.ORDER_READ_OWN,
  Permission.ORDER_UPDATE_OWN,
];

const STAFF: readonly Permission[] = [
  ...CUSTOMER,
  Permission.PRODUCT_CREATE,
  Permission.PRODUCT_UPDATE,
  Permission.STOCK_UPDATE,
  Permission.ORDER_READ_ANY,
  Permission.ORDER_UPDATE_ANY,
  Permission.PICKUP_READ,
  Permission.PICKUP_CREATE,
  Permission.REPORT_READ,
];

/**
 * | Permission            | STUDENT | ALUMNI | STAFF | ADMIN |
 * |-----------------------|:-:|:-:|:-:|:-:|
 * | product:read          | ✅ | ✅ | ✅ | ✅ |
 * | product:create/update | — | — | ✅ | ✅ |
 * | product:delete        | — | — | — | ✅ |
 * | stock:update          | — | — | ✅ | ✅ |
 * | order:create:own      | ✅ | ✅ | ✅ | ✅ |
 * | order:read:own        | ✅ | ✅ | ✅ | ✅ |
 * | order:update:own      | ✅ | ✅ | ✅ | ✅ |
 * | order:read:any        | — | — | ✅ | ✅ |
 * | order:update:any      | — | — | ✅ | ✅ |
 * | order:delete:any      | — | — | — | ✅ |
 * | pickup:read/create    | — | — | ✅ | ✅ |
 * | pickup:delete         | — | — | — | ✅ |
 * | report:read           | — | — | ✅ | ✅ |
 */
export const ROLE_PERMISSIONS: Record<SubsystemRole, readonly Permission[]> = {
  STUDENT: CUSTOMER,
  ALUMNI: CUSTOMER,
  STAFF,
  ADMIN: [
    ...STAFF,
    Permission.PRODUCT_DELETE,
    Permission.ORDER_DELETE_ANY,
    Permission.PICKUP_DELETE,
  ],
};

export function permissionsFor(role: SubsystemRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(granted: readonly Permission[], permission: Permission): boolean {
  return granted.includes(permission);
}
