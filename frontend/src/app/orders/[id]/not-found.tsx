import { OrderNotFound } from "@/components/features/shop/order-not-found";

// EmptyState สำหรับ 404 ของคำสั่งซื้อ (design-system.md §9.3 NOT_FOUND) — ไม่ใช่ error สีแดง
export default function NotFound() {
  return <OrderNotFound />;
}
