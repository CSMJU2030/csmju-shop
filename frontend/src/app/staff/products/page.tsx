import type { Metadata } from "next";
import { PageHeader } from "@/csmju";
import { ProductsPage } from "@/components/features/staff/products-page";

export const metadata: Metadata = { title: "จัดการสินค้า" };

export default function StaffProductsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="จัดการสินค้า"
        description="เพิ่ม แก้ไข และลบสินค้า อัปโหลดรูป และกำหนดตัวเลือกกับราคาของสินค้าแต่ละชิ้น"
      />
      <ProductsPage />
    </div>
  );
}
