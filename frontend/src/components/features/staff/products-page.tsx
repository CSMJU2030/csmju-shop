"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AddIcon,
  ConfirmDeleteModal,
  DeleteIcon,
  EditIcon,
  SearchIcon,
  StatusBadge,
  cardClass,
  iconButtonClass,
  iconDangerButtonClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  tdClass,
  thClass,
} from "@/csmju";
import { ApiError, api, type Page } from "@/lib/api";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { PERMISSION, can } from "@/lib/permissions";
import type { Product, ProductCategory } from "@/lib/types";
import { ApiErrorView, errorMessage } from "@/components/shared/api-error-view";
import { FormField } from "@/components/shared/form-field";
import { Pagination } from "@/components/shared/pagination";
import { ProductArt } from "@/components/shared/product-art";
import { useMe } from "@/components/shared/session-context";
import { InventoryIcon } from "@/components/shared/shop-icons";
import { EmptyState, TableSkeleton } from "@/components/shared/states";
import { useToast } from "@/components/shared/toast";
import { ProductEditor, deleteUploadedImage } from "./products-editor";
import { CategoryTag, focusRing } from "./products-ui";
import { StockLevelBadge } from "./stock-level-badge";

const PAGE_SIZE = 20;

type ListState =
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | { status: "ready"; data: Page<Product> };

type EditorTarget = { mode: "create" } | { mode: "edit"; productId: string };

interface PendingDelete {
  product: Product;
  blockedReason?: string;
}

function priceRange(product: Product): string {
  if (product.variants.length === 0) return "—";
  const prices = product.variants.map((v) => v.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`;
}

function totalStock(product: Product): number {
  return product.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
}

export function ProductsPage() {
  const me = useMe();
  const toast = useToast();
  const canCreate = can(me?.permissions, PERMISSION.PRODUCT_CREATE);
  const canUpdate = can(me?.permissions, PERMISSION.PRODUCT_UPDATE);
  const canDelete = can(me?.permissions, PERMISSION.PRODUCT_DELETE);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const deletingRef = useRef(false);

  // ค้นหาหลังหยุดพิมพ์ 400ms (ส่งให้ backend ค้น ไม่ได้กรองในหน้าเว็บ)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setList({ status: "loading" });
    api
      .listProducts({ page, limit: PAGE_SIZE, category: category || undefined, search: search || undefined })
      .then((data) => {
        if (!cancelled) setList({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!cancelled) setList({ status: "error", error });
      });
    return () => {
      cancelled = true;
    };
  }, [page, category, search, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    api
      .listCategories()
      .then((data) => {
        if (!cancelled) setCategories(data.items);
      })
      .catch(() => {
        // ตัวกรองหมวดหมู่ใช้ไม่ได้ชั่วคราว แต่รายการสินค้ายังทำงานต่อได้
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const hasFilter = search !== "" || category !== "";
  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setCategory("");
    setPage(1);
  };

  const closeEditor = () => {
    setEditor(null);
    reload();
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deletingRef.current) return;
    const { product } = pendingDelete;
    deletingRef.current = true;
    try {
      await api.deleteProduct(product.id);
      if (product.imageUrl) await deleteUploadedImage(product.imageUrl);
      setPendingDelete(null);
      toast(`ลบสินค้า “${product.name}” แล้ว`);
      if (list.status === "ready" && list.data.items.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (error) {
      if (error instanceof ApiError && error.code === "UNAUTHORIZED") return;
      setPendingDelete({ product, blockedReason: errorMessage(error) });
    } finally {
      deletingRef.current = false;
    }
  };

  if (editor) {
    return (
      <ProductEditor
        key={editor.mode === "edit" ? editor.productId : "new"}
        productId={editor.mode === "edit" ? editor.productId : null}
        categories={categories.map((c) => c.category)}
        canEditVariants={canUpdate}
        onDone={closeEditor}
      />
    );
  }

  const showActions = canUpdate || canDelete;

  return (
    <section className={cardClass} aria-labelledby="products-list-title">
      <h2 id="products-list-title" className="sr-only">
        รายการสินค้า
      </h2>
      <div className="flex flex-col gap-4 border-b border-outline-variant/40 px-6 py-5 md:flex-row md:items-end">
        <div className="md:flex-1">
          <FormField id="products-search" label="ค้นหาสินค้า">
            <div className="relative">
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-outline"
              />
              <input
                id="products-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="ชื่อหรือรายละเอียดสินค้า"
                className={`${inputClass} pl-10`}
              />
            </div>
          </FormField>
        </div>
        <div className="md:w-48">
          <FormField id="products-category" label="หมวดหมู่">
            <select
              id="products-category"
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
        {hasFilter && (
          <button type="button" onClick={clearFilters} className={`${secondaryButtonClass} ${focusRing}`}>
            ล้างตัวกรอง
          </button>
        )}
        {canCreate && (
          <button
            type="button"
            onClick={() => setEditor({ mode: "create" })}
            className={`${primaryButtonClass} ${focusRing} md:ml-auto`}
          >
            <AddIcon className="h-4 w-4" aria-hidden="true" />
            เพิ่มสินค้า
          </button>
        )}
      </div>

      {list.status === "loading" && <TableSkeleton rows={6} />}

      {list.status === "error" && <ApiErrorView error={list.error} onRetry={reload} />}

      {list.status === "ready" && list.data.items.length === 0 && (
        hasFilter ? (
          <EmptyState
            icon={<SearchIcon className="h-10 w-10" aria-hidden="true" />}
            title="ไม่พบสินค้าที่ตรงกับการค้นหา"
            description="ลองเปลี่ยนคำค้นหาหรือหมวดหมู่ หรือล้างตัวกรองเพื่อดูสินค้าทั้งหมด"
            action={
              <button type="button" onClick={clearFilters} className={`${secondaryButtonClass} ${focusRing}`}>
                ล้างตัวกรอง
              </button>
            }
          />
        ) : (
          <EmptyState
            icon={<InventoryIcon className="h-10 w-10" aria-hidden="true" />}
            title="ยังไม่มีสินค้าในร้าน"
            description="เริ่มต้นด้วยการเพิ่มสินค้าชิ้นแรก แล้วเพิ่มตัวเลือก ราคา และจำนวนคงเหลือของสินค้านั้น"
            action={
              canCreate ? (
                <button
                  type="button"
                  onClick={() => setEditor({ mode: "create" })}
                  className={`${primaryButtonClass} ${focusRing}`}
                >
                  <AddIcon className="h-4 w-4" aria-hidden="true" />
                  เพิ่มสินค้า
                </button>
              ) : undefined
            }
          />
        )
      )}

      {list.status === "ready" && list.data.items.length > 0 && (
        <>
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-3xl border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant/40 bg-surface text-label-md text-on-surface-variant">
                  <th scope="col" className={thClass}>
                    สินค้า
                  </th>
                  <th scope="col" className={thClass}>
                    หมวดหมู่
                  </th>
                  <th scope="col" className={thClass}>
                    ประเภท
                  </th>
                  <th scope="col" className={`${thClass} text-right`}>
                    ราคา
                  </th>
                  <th scope="col" className={`${thClass} text-right`}>
                    คงเหลือรวม
                  </th>
                  {showActions && (
                    <th scope="col" className={`${thClass} text-right`}>
                      จัดการ
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((product) => {
                  const stock = totalStock(product);
                  return (
                    <tr
                      key={product.id}
                      className="border-b border-outline-variant/40 text-body-md last:border-0 hover:bg-surface/50"
                    >
                      <td className={tdClass}>
                        <div className="flex items-center gap-3">
                          <ProductArt
                            name={product.name}
                            category={product.category}
                            src={product.imageUrl}
                            sizes="48px"
                            className="h-12 w-12 shrink-0 rounded-lg"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-on-surface">{product.name}</p>
                            <p className="text-label-sm text-secondary tabular-nums">
                              {product.variants.length === 0
                                ? "ยังไม่มีตัวเลือกสินค้า"
                                : `${formatNumber(product.variants.length)} ตัวเลือก`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={tdClass}>
                        <CategoryTag>{product.category}</CategoryTag>
                      </td>
                      <td className={tdClass}>
                        {product.isPreorder ? (
                          <div className="space-y-1">
                            <StatusBadge tone="info" label="พรีออเดอร์" />
                            <p className="text-label-sm text-secondary whitespace-nowrap">
                              ปิดรับ {formatDate(product.preorderEndDate)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-on-surface-variant">พร้อมส่ง</span>
                        )}
                      </td>
                      <td className={`${tdClass} text-right whitespace-nowrap text-on-surface-variant tabular-nums`}>
                        {priceRange(product)}
                      </td>
                      <td className={`${tdClass} text-right`}>
                        {product.variants.length === 0 ? (
                          <StatusBadge tone="warning" label="ยังไม่มีตัวเลือก" />
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-medium text-on-surface tabular-nums">{formatNumber(stock)}</span>
                            <StockLevelBadge quantity={stock} isPreorder={product.isPreorder} />
                          </div>
                        )}
                      </td>
                      {showActions && (
                        <td className={`${tdClass} text-right whitespace-nowrap`}>
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => setEditor({ mode: "edit", productId: product.id })}
                              aria-label={`แก้ไข ${product.name}`}
                              className={`${iconButtonClass} rounded-lg ${focusRing}`}
                            >
                              <EditIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setPendingDelete({ product })}
                              aria-label={`ลบ ${product.name}`}
                              className={`${iconDangerButtonClass} rounded-lg ${focusRing}`}
                            >
                              <DeleteIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination meta={list.data.meta} onPage={setPage} />
        </>
      )}

      {pendingDelete && (
        <ConfirmDeleteModal
          title="ลบสินค้า"
          message={
            <>
              ลบสินค้า <strong className="text-on-surface">“{pendingDelete.product.name}”</strong> ถาวร?
              ตัวเลือกสินค้าทั้งหมด {formatNumber(pendingDelete.product.variants.length)} รายการและรูปสินค้าจะถูกลบไปด้วย
              สินค้าที่เคยถูกสั่งซื้อแล้วจะลบไม่ได้
            </>
          }
          blockedReason={pendingDelete.blockedReason}
          onConfirm={confirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}
