import type { Metadata } from "next";
import { PageHeader } from "@/csmju";
import { OrdersManager, type OrdersFilters } from "@/components/features/staff/orders-manager";
import { DELIVERY_METHOD_LABEL, ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/status";
import type { DeliveryMethod, OrderStatus, PaymentStatus } from "@/lib/types";

export const metadata: Metadata = { title: "จัดการคำสั่งซื้อ" };

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function oneOf<T extends string>(value: string, allowed: readonly T[]): T | "" {
  return (allowed as readonly string[]).includes(value) ? (value as T) : "";
}

export default async function StaffOrdersPage({ searchParams }: PageProps<"/staff/orders">) {
  const params = await searchParams;
  // ลิงก์จากหน้าภาพรวม / จุดรับสินค้าเปิดหน้านี้พร้อมตัวกรอง เช่น ?paymentStatus=WAITING_VERIFY
  const initialFilters: OrdersFilters = {
    search: one(params.search).trim().slice(0, 100),
    orderStatus: oneOf<OrderStatus>(one(params.orderStatus), ORDER_STATUSES),
    paymentStatus: oneOf<PaymentStatus>(one(params.paymentStatus), PAYMENT_STATUSES),
    deliveryMethod: oneOf<DeliveryMethod>(
      one(params.deliveryMethod),
      Object.keys(DELIVERY_METHOD_LABEL) as DeliveryMethod[],
    ),
  };
  const page = Number.parseInt(one(params.page), 10);

  return (
    <div className="space-y-8">
      <PageHeader
        title="จัดการคำสั่งซื้อ"
        description="ตรวจสลิป อัปเดตสถานะ และบันทึกเลขพัสดุของคำสั่งซื้อทั้งหมด"
      />
      <OrdersManager initialFilters={initialFilters} initialPage={Number.isFinite(page) && page > 0 ? page : 1} />
    </div>
  );
}
