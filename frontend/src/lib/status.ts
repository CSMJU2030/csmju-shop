import type { StatusTone } from "@/csmju";
import type { OrderStatus, PaymentStatus } from "./types";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: StatusTone }> = {
  PENDING: { label: "รอดำเนินการ", tone: "warning" },
  CONFIRMED: { label: "ยืนยันแล้ว", tone: "info" },
  PREPARING: { label: "กำลังเตรียมสินค้า", tone: "info" },
  READY_FOR_PICKUP: { label: "พร้อมรับสินค้า", tone: "success" },
  SHIPPED: { label: "จัดส่งแล้ว", tone: "info" },
  COMPLETED: { label: "สำเร็จ", tone: "success" },
  CANCELLED: { label: "ยกเลิก", tone: "neutral" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: StatusTone }> = {
  PENDING: { label: "รอชำระเงิน", tone: "warning" },
  WAITING_VERIFY: { label: "รอตรวจสลิป", tone: "warning" },
  PAID: { label: "ชำระเงินแล้ว", tone: "success" },
  REJECTED: { label: "สลิปไม่ผ่าน", tone: "error" },
  REFUNDED: { label: "คืนเงินแล้ว", tone: "neutral" },
};

export const ORDER_STATUSES = Object.keys(ORDER_STATUS) as OrderStatus[];
export const PAYMENT_STATUSES = Object.keys(PAYMENT_STATUS) as PaymentStatus[];

export const DELIVERY_METHOD_LABEL = { PICKUP: "รับที่สาขา", DELIVERY: "จัดส่งพัสดุ" } as const;

/** ไทม์ไลน์ของคำสั่งซื้อแบบรับที่สาขา */
export const PICKUP_TIMELINE: { key: OrderStatus; label: string }[] = [
  { key: "CONFIRMED", label: "ชำระเงินแล้ว" },
  { key: "PREPARING", label: "กำลังเตรียมสินค้า" },
  { key: "READY_FOR_PICKUP", label: "พร้อมรับสินค้า" },
  { key: "COMPLETED", label: "รับสินค้าแล้ว" },
];

/** ไทม์ไลน์ของคำสั่งซื้อแบบจัดส่ง */
export const DELIVERY_TIMELINE: { key: OrderStatus; label: string }[] = [
  { key: "CONFIRMED", label: "ชำระเงินแล้ว" },
  { key: "PREPARING", label: "กำลังเตรียมพัสดุ" },
  { key: "SHIPPED", label: "ส่งเข้าขนส่งแล้ว" },
  { key: "COMPLETED", label: "ได้รับพัสดุแล้ว" },
];

/** คำเรียกบทบาทมาตรฐาน (design-system.md ข้อ 10.3) */
export const CORE_ROLE_LABEL: Record<string, string> = {
  student: "นักศึกษา",
  alumni: "ศิษย์เก่า",
  staff: "บุคลากร/อาจารย์",
  admin: "ผู้ดูแลระบบ",
};
