import { CheckIcon } from "@/csmju";
import { DELIVERY_TIMELINE, PICKUP_TIMELINE } from "@/lib/status";
import type { Order } from "@/lib/types";

/** ตำแหน่งปัจจุบันบนไทม์ไลน์ (-1 = ยังไม่ชำระเงิน / รอตรวจสลิป) */
function stageOf(order: Order, timeline: { key: Order["orderStatus"] }[]): number {
  if (order.orderStatus === "COMPLETED") return timeline.length - 1;
  const index = timeline.findIndex((step) => step.key === order.orderStatus);
  if (index >= 0) return index;
  if (order.orderStatus === "READY_FOR_PICKUP" || order.orderStatus === "SHIPPED") return 2;
  if (order.paymentStatus === "PAID") return 0;
  return -1;
}

/**
 * ไทม์ไลน์สถานะคำสั่งซื้อ (design-system.md ข้อ 7.2.1 Timeline)
 * จุด 24px · ขั้นปัจจุบัน = brand-gradient + จุดขาว · เส้นเชื่อม surface-container 2px
 * แต่ละขั้นมีข้อความสถานะให้ screen reader ไม่พึ่งสีอย่างเดียว
 */
export function OrderTimeline({ order }: { order: Order }) {
  const timeline = order.deliveryMethod === "PICKUP" ? PICKUP_TIMELINE : DELIVERY_TIMELINE;
  const stage = stageOf(order, timeline);

  return (
    <ol className="space-y-0">
      {timeline.map((step, i) => {
        const done = i < stage || (i === stage && order.orderStatus === "COMPLETED");
        const current = i === stage && !done;
        const last = i === timeline.length - 1;
        return (
          <li key={step.key} className="relative flex gap-4 pb-6 last:pb-0" aria-current={current ? "step" : undefined}>
            {!last && (
              <span
                aria-hidden="true"
                className={`absolute top-6 left-3 h-full w-0.5 -translate-x-1/2 ${
                  i < stage ? "bg-primary-container" : "bg-surface-container"
                }`}
              />
            )}
            <span
              aria-hidden="true"
              className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                done ? "bg-primary-container text-white" : current ? "brand-gradient" : "bg-surface-container"
              }`}
            >
              {done && <CheckIcon className="h-4 w-4" />}
              {current && <span className="h-2 w-2 rounded-full bg-white" />}
              {!done && !current && <span className="h-2 w-2 rounded-full bg-outline" />}
            </span>
            <p className={`text-body-md ${done || current ? "font-semibold text-on-surface" : "text-on-surface-variant"}`}>
              {step.label}
              <span className="sr-only">
                {done ? " (เสร็จแล้ว)" : current ? " (ขั้นตอนปัจจุบัน)" : " (ยังไม่ถึงขั้นตอนนี้)"}
              </span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}
