import type { Metadata } from "next";
import { PageHeader } from "@/csmju";
import { PickupDesk } from "@/components/features/staff/pickup-desk";

export const metadata: Metadata = { title: "จุดรับสินค้า" };

export default function StaffPickupPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="จุดรับสินค้า"
        description="สแกน QR หรือพิมพ์รหัสรับสินค้าของลูกค้า ตรวจคำสั่งซื้อ แล้วบันทึกการส่งมอบ"
      />
      <PickupDesk />
    </div>
  );
}
