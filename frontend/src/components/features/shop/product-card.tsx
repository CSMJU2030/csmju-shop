"use client";

import { AddIcon, CalendarTodayIcon, StatusBadge, cardClass } from "@/csmju";
import { ProductArt } from "@/components/shared/product-art";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import type { Product, ProductVariant } from "@/lib/types";
import { isPreorderClosed, priceRange, tonalButtonClass, variantBlockedReason } from "./shop-ui";

/** ป้ายสถานะของสินค้าทั้งชิ้น — มีข้อความกำกับเสมอ ไม่พึ่งสีอย่างเดียว */
function ProductBadge({ product, preorderClosed }: { product: Product; preorderClosed: boolean }) {
  if (product.isPreorder) {
    return preorderClosed ? (
      <StatusBadge tone="neutral" label="ปิดรับพรีออเดอร์" />
    ) : (
      <StatusBadge tone="info" label="พรีออเดอร์" />
    );
  }
  const inStock = product.variants.some((v) => v.stockQuantity > 0);
  return inStock ? <StatusBadge tone="success" label="มีสินค้า" /> : <StatusBadge tone="neutral" label="สินค้าหมด" />;
}

function VariantRow({
  product,
  variant,
  inCart,
  preorderClosed,
  onAdd,
}: {
  product: Product;
  variant: ProductVariant;
  inCart: number;
  preorderClosed: boolean;
  onAdd: (variant: ProductVariant, product: Product) => void;
}) {
  const blocked = variantBlockedReason(product, variant, inCart, preorderClosed);
  const reasonId = `variant-${variant.id}-reason`;
  const soldOut = !product.isPreorder && variant.stockQuantity <= 0;

  return (
    <li className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <p className="text-body-md text-on-surface">
          {variant.variantName}
          <span className="text-on-surface-variant"> · </span>
          <span className="tabular-nums">{formatMoney(variant.price)}</span>
        </p>
        <p id={reasonId} className={`text-body-md ${soldOut ? "text-error" : "text-on-surface-variant"}`}>
          {product.isPreorder && (blocked ?? "สั่งจองได้แม้ยังไม่มีสต็อก")}
          {soldOut && "สินค้าหมด"}
          {!product.isPreorder && !soldOut && (
            <>
              คงเหลือ <span className="tabular-nums">{formatNumber(variant.stockQuantity)}</span> ชิ้น
              {blocked && ` · ${blocked}`}
            </>
          )}
          {inCart > 0 && (
            <>
              {" · "}ในตะกร้า <span className="tabular-nums">{formatNumber(inCart)}</span>
            </>
          )}
        </p>
      </div>
      <button
        type="button"
        className={`${tonalButtonClass} shrink-0`}
        disabled={blocked !== null}
        aria-describedby={reasonId}
        onClick={() => onAdd(variant, product)}
      >
        <AddIcon className="h-4 w-4" />
        {product.isPreorder ? "สั่งจอง" : "เพิ่มลงตะกร้า"}
        <span className="sr-only">
          {" "}
          {product.name} ตัวเลือก {variant.variantName}
        </span>
      </button>
    </li>
  );
}

export function ProductCard({
  product,
  quantityInCart,
  onAdd,
}: {
  product: Product;
  quantityInCart: (variantId: string) => number;
  onAdd: (variant: ProductVariant, product: Product) => void;
}) {
  const preorderClosed = isPreorderClosed(product);
  const range = priceRange(product);

  return (
    <article className={`${cardClass} flex flex-col`}>
      <div className="relative">
        <ProductArt
          name={product.name}
          category={product.category}
          src={product.imageUrl}
          className="aspect-4/3 w-full"
          sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
        />
        <div className="absolute top-3 left-3">
          <ProductBadge product={product} preorderClosed={preorderClosed} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="space-y-1">
          <p className="text-label-sm text-secondary">{product.category}</p>
          <h2 className="text-body-lg font-semibold text-on-surface">{product.name}</h2>
          <p className="text-body-md font-semibold text-primary-container tabular-nums">
            {range ?? "ยังไม่มีตัวเลือกสินค้า"}
          </p>
          {product.description && (
            <p className="text-body-md text-on-surface-variant">{product.description}</p>
          )}
        </div>

        {product.isPreorder && (
          <dl className="space-y-1 rounded-lg bg-primary-container/10 px-4 py-3 text-body-md">
            <div className="flex justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-on-surface-variant">
                <CalendarTodayIcon className="h-4 w-4 shrink-0" />
                ปิดรับจอง
              </dt>
              <dd className="text-on-surface tabular-nums">{formatDate(product.preorderEndDate)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-on-surface-variant">คาดว่าจะได้รับ</dt>
              <dd className="text-on-surface tabular-nums">{formatDate(product.estimatedDelivery)}</dd>
            </div>
          </dl>
        )}

        {product.variants.length > 0 ? (
          <ul className="mt-auto divide-y divide-outline-variant/40 border-t border-outline-variant/40 pt-4" aria-label={`ตัวเลือกของ ${product.name}`}>
            {product.variants.map((variant) => (
              <VariantRow
                key={variant.id}
                product={product}
                variant={variant}
                inCart={quantityInCart(variant.id)}
                preorderClosed={preorderClosed}
                onAdd={onAdd}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-auto text-body-md text-on-surface-variant">สินค้านี้ยังไม่เปิดขาย</p>
        )}
      </div>
    </article>
  );
}
