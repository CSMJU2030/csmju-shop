import type { Metadata } from "next";
import { PageHeader } from "@/csmju";
import { StockPage } from "@/components/features/staff/stock-page";

export const metadata: Metadata = { title: "สต็อกและพรีออเดอร์" };

export default function StaffStockPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="สต็อกและพรีออเดอร์"
        description="ปรับจำนวนคงเหลือของตัวเลือกสินค้า ดูรายการที่ใกล้หมด และสรุปยอดพรีออเดอร์ที่ต้องสั่งผลิต"
      />
      <StockPage />
    </div>
  );
}
