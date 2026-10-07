import { ProductArt } from "@/components/shared/product-art";
import { formatMoney, formatNumber } from "@/lib/format";
import type { OrderItem } from "@/lib/types";

/** รายการสินค้าในคำสั่งซื้อ (ใช้ทั้งหน้าจัดการคำสั่งซื้อและจุดรับสินค้า) */
export function OrdersItemList({ items }: { items: OrderItem[] }) {
  if (items.length === 0) {
    return <p className="text-body-md text-on-surface-variant">คำสั่งซื้อนี้ไม่มีรายการสินค้า</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center gap-3 rounded-lg border border-outline-variant/40 px-3 py-3"
        >
          <ProductArt
            name={item.variant.product.name}
            category={item.variant.product.category}
            src={item.variant.product.imageUrl}
            sizes="48px"
            className="h-12 w-12 shrink-0 rounded-lg"
          />
          <div className="min-w-0 flex-1">
            <p className="text-body-md text-on-surface">{item.variant.product.name}</p>
            <p className="text-body-md text-on-surface-variant">
              {item.variant.variantName}
              {item.isPreorderItem && (
                <span className="ml-2 inline-flex rounded-full bg-primary-container/10 px-2.5 py-1 text-label-sm text-primary-container">
                  พรีออเดอร์
                </span>
              )}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-label-md text-on-surface tabular-nums">× {formatNumber(item.quantity)}</p>
            <p className="text-body-md text-on-surface-variant tabular-nums">
              {formatMoney(item.unitPrice * item.quantity)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
