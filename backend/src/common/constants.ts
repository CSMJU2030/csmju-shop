/** ค่าคงที่ที่ใช้ร่วมกันทั้งระบบ */

export const ROLES = ['customer', 'staff', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const DELIVERY_METHODS = ['pickup', 'delivery'] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const PAYMENT_STATUSES = [
  'pending',
  'waiting_verify',
  'paid',
  'rejected',
  'refunded',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'shipped',
  'completed',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** ค่าจัดส่งเริ่มต้นเมื่อเลือก delivery แต่ไม่ระบุ shipping_fee */
export const DEFAULT_SHIPPING_FEE = 50;
