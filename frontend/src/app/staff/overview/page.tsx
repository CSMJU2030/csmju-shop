import type { Metadata } from "next";
import { PageHeader } from "@/csmju";
import { DashboardOverview } from "@/components/features/staff/dashboard-overview";

export const metadata: Metadata = { title: "ภาพรวมร้านค้า" };

export default function StaffDashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="ภาพรวมร้านค้า" description="ยอดขาย จำนวนคำสั่งซื้อตามสถานะ และสลิปที่รอตรวจ" />
      <DashboardOverview />
    </div>
  );
}
