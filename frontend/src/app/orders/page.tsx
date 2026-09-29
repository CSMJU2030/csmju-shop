import type { Metadata } from "next";
import { MyOrders } from "@/components/features/shop/my-orders";

export const metadata: Metadata = { title: "คำสั่งซื้อของฉัน" };

export default function MyOrdersPage() {
  return <MyOrders />;
}
