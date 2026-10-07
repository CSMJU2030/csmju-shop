/**
 * permission ของร้านค้า (ฝั่งหน้าเว็บ) — ใช้แค่ตัดสินใจว่าจะ "แสดง" อะไร
 * การบังคับสิทธิ์จริงอยู่ที่ backend เสมอ (backend/src/auth/permissions.ts)
 */
export const PERMISSION = {
  PRODUCT_CREATE: "product:create",
  PRODUCT_UPDATE: "product:update",
  PRODUCT_DELETE: "product:delete",
  STOCK_UPDATE: "stock:update",
  ORDER_READ_ANY: "order:read:any",
  ORDER_UPDATE_ANY: "order:update:any",
  ORDER_DELETE_ANY: "order:delete:any",
  PICKUP_READ: "pickup:read",
  PICKUP_CREATE: "pickup:create",
  REPORT_READ: "report:read",
} as const;

export type ShopPermission = (typeof PERMISSION)[keyof typeof PERMISSION];

export function can(permissions: readonly string[] | undefined, permission: ShopPermission): boolean {
  return !!permissions?.includes(permission);
}

/** เข้าหน้าเจ้าหน้าที่ได้ไหม */
export function isStaff(permissions: readonly string[] | undefined): boolean {
  return can(permissions, PERMISSION.ORDER_READ_ANY);
}
