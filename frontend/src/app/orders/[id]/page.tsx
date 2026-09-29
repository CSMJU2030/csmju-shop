import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetail } from "@/components/features/shop/order-detail";
import { UUID_PATTERN } from "@/components/features/shop/shop-ui";

export const metadata: Metadata = { title: "รายละเอียดคำสั่งซื้อ" };

export default async function OrderDetailPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  // path param ต้องเป็น UUID — รูปแบบผิดถือว่าไม่พบ (EmptyState ไม่ใช่ error สีแดง)
  if (!UUID_PATTERN.test(id)) notFound();
  return <OrderDetail id={id} />;
}
