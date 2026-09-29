import Link from "next/link";
import { ReceiptIcon, cardClass, secondaryButtonClass } from "@/csmju";
import { EmptyState } from "@/components/shared/states";
import { focusRing } from "./shop-ui";

/** ไม่พบคำสั่งซื้อ (404 / id ผิดรูปแบบ) — EmptyState + ปุ่มย้อนกลับ (design-system.md ข้อ 9.3) */
export function OrderNotFound() {
  return (
    <div className="space-y-8">
      <h1 className="sr-only">ไม่พบคำสั่งซื้อ</h1>
      <div className={cardClass}>
        <EmptyState
          icon={<ReceiptIcon className="h-10 w-10" />}
          title="ไม่พบข้อมูลที่คุณกำลังค้นหา"
          description="คำสั่งซื้อนี้อาจถูกลบไปแล้วหรือลิงก์ไม่ถูกต้อง"
          action={
            <Link href="/orders" className={`${secondaryButtonClass} ${focusRing}`}>
              กลับไปคำสั่งซื้อของฉัน
            </Link>
          }
        />
      </div>
    </div>
  );
}
