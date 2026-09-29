"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, SearchIcon, cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from "@/csmju";
import { ApiErrorView } from "@/components/shared/api-error-view";
import { FormField } from "@/components/shared/form-field";
import { Pagination } from "@/components/shared/pagination";
import { ShoppingBagIcon, StorefrontIcon } from "@/components/shared/shop-icons";
import { EmptyState } from "@/components/shared/states";
import { useToast } from "@/components/shared/toast";
import type { Page } from "@/lib/api";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { formatMoney, formatNumber } from "@/lib/format";
import type { Product, ProductCategory, ProductVariant } from "@/lib/types";
import { ProductCard } from "./product-card";
import { focusRing } from "./shop-ui";
import { ProductGridSkeleton } from "./skeletons";

const PAGE_SIZE = 12;

type Availability = "" | "ready" | "preorder";

const AVAILABILITY_OPTIONS: { value: Availability; label: string }[] = [
  { value: "", label: "ทุกประเภท" },
  { value: "ready", label: "สินค้าพร้อมส่ง" },
  { value: "preorder", label: "สินค้าพรีออเดอร์" },
];

type LoadState =
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | { status: "ready"; page: Page<Product> };

function CartSummaryLink() {
  const { count, subtotal, ready } = useCart();
  return (
    <Link href="/checkout" className={`${primaryButtonClass} min-h-11 md:min-h-0 ${focusRing}`}>
      <ShoppingBagIcon className="h-4 w-4" />
      {ready && count > 0 ? (
        <span className="tabular-nums">
          ตะกร้าสินค้า {formatNumber(count)} ชิ้น · {formatMoney(subtotal)}
        </span>
      ) : (
        <span>ตะกร้าสินค้า</span>
      )}
    </Link>
  );
}

export function Catalogue() {
  const { add, lines } = useCart();
  const toast = useToast();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [availability, setAvailability] = useState<Availability>("");
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  // หน่วงคำค้น 300ms ก่อนถาม backend (ไม่ยิงทุกตัวอักษร)
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    api
      .listCategories()
      .then((r) => active && setCategories(r.items))
      .catch(() => {
        /* โหลดหมวดหมู่ไม่ได้ ยังค้นหาและกรองประเภทได้ตามปกติ */
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    api
      .listProducts({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        category: category || undefined,
        isPreorder: availability === "" ? undefined : availability === "preorder",
      })
      .then((result) => active && setState({ status: "ready", page: result }))
      .catch((error: unknown) => active && setState({ status: "error", error }));
    return () => {
      active = false;
    };
  }, [page, search, category, availability, reloadKey]);

  const inCart = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of lines) map.set(line.variantId, line.quantity);
    return map;
  }, [lines]);
  const quantityInCart = useCallback((variantId: string) => inCart.get(variantId) ?? 0, [inCart]);

  const handleAdd = useCallback(
    (variant: ProductVariant, product: Product) => {
      add(variant, product);
      toast(`เพิ่ม ${product.name} (${variant.variantName}) ลงตะกร้าแล้ว`);
    },
    [add, toast],
  );

  const filtered = search !== "" || category !== "" || availability !== "";

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setCategory("");
    setAvailability("");
    setPage(1);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="ร้านค้า"
        description="เสื้อผ้าและของที่ระลึกอย่างเป็นทางการของสาขาวิชาวิทยาการคอมพิวเตอร์"
      />

      <section className={cardClass} aria-label="รายการสินค้า">
        <div className="flex flex-col gap-4 border-b border-outline-variant/40 px-6 py-5 xl:flex-row xl:items-end">
          <form
            role="search"
            className="flex flex-1 flex-col gap-3 md:flex-row md:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput.trim());
              setPage(1);
            }}
          >
            <div className="flex-1">
              <FormField id="product-search" label="ค้นหาสินค้า">
                <div className="relative">
                  <SearchIcon
                    className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-outline"
                  />
                  <input
                    id="product-search"
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="ชื่อสินค้าหรือรายละเอียด"
                    maxLength={100}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </FormField>
            </div>
            <div className="md:w-48">
              <FormField id="product-category" label="หมวดหมู่">
                <select
                  id="product-category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                  className={inputClass}
                >
                  <option value="">ทุกหมวดหมู่</option>
                  {categories.map((c) => (
                    <option key={c.category} value={c.category}>
                      {c.category} ({formatNumber(c.productCount)})
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <div className="md:w-48">
              <FormField id="product-availability" label="ประเภทสินค้า">
                <select
                  id="product-availability"
                  value={availability}
                  onChange={(e) => {
                    setAvailability(e.target.value as Availability);
                    setPage(1);
                  }}
                  className={inputClass}
                >
                  {AVAILABILITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            {filtered && (
              <button type="button" onClick={clearFilters} className={`${secondaryButtonClass} min-h-11 md:min-h-0 ${focusRing}`}>
                ล้างตัวกรอง
              </button>
            )}
          </form>
          <CartSummaryLink />
        </div>

        {state.status === "loading" && (
          <div aria-busy="true" aria-live="polite">
            <span className="sr-only">กำลังโหลดข้อมูล...</span>
            <ProductGridSkeleton count={PAGE_SIZE / 2} />
          </div>
        )}

        {state.status === "error" && (
          <ApiErrorView error={state.error} onRetry={() => setReloadKey((k) => k + 1)} />
        )}

        {state.status === "ready" && state.page.items.length === 0 && (
          filtered ? (
            <EmptyState
              icon={<SearchIcon className="h-10 w-10" />}
              title="ไม่พบสินค้าที่ตรงกับการค้นหา"
              description="ลองเปลี่ยนคำค้นหรือตัวกรอง แล้วค้นหาอีกครั้ง"
              action={
                <button type="button" onClick={clearFilters} className={`${secondaryButtonClass} ${focusRing}`}>
                  ล้างตัวกรอง
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={<StorefrontIcon className="h-10 w-10" />}
              title="ยังไม่มีสินค้าในร้าน"
              description="เจ้าหน้าที่ยังไม่ได้เปิดขายสินค้า กรุณากลับมาดูอีกครั้งภายหลัง"
              action={
                <Link href="/orders" className={`${secondaryButtonClass} ${focusRing}`}>
                  ดูคำสั่งซื้อของฉัน
                </Link>
              }
            />
          )
        )}

        {state.status === "ready" && state.page.items.length > 0 && (
          <>
            <p className="sr-only" aria-live="polite">
              พบสินค้า {formatNumber(state.page.meta.total)} รายการ
            </p>
            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 xl:grid-cols-3">
              {state.page.items.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantityInCart={quantityInCart}
                  onAdd={handleAdd}
                />
              ))}
            </div>
            <Pagination
              meta={state.page.meta}
              onPage={(p) => {
                setPage(p);
                window.scrollTo({ top: 0 });
              }}
            />
          </>
        )}
      </section>
    </div>
  );
}
