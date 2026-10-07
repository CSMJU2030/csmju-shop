"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import {
  AddIcon,
  ConfirmDeleteModal,
  DeleteIcon,
  EditIcon,
  Modal,
  cardClass,
  iconButtonClass,
  iconDangerButtonClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  tdClass,
  thClass,
} from "@/csmju";
import { ApiError, api } from "@/lib/api";
import { bahtInputToSatang, formatMoney, formatNumber, satangToBahtInput } from "@/lib/format";
import type { Product, ProductVariant, VariantWithProduct } from "@/lib/types";
import { errorMessage } from "@/components/shared/api-error-view";
import { FormField, describedBy } from "@/components/shared/form-field";
import { InventoryIcon } from "@/components/shared/shop-icons";
import { Alert, EmptyState } from "@/components/shared/states";
import { useToast } from "@/components/shared/toast";
import { LoadingButton, focusRing, tonalButtonClass } from "./products-ui";
import { StockLevelBadge } from "./stock-level-badge";

/** ตัดข้อมูลสินค้าที่ API แนบมาออก ให้เหลือรูปแบบเดียวกับ product.variants */
function toProductVariant(v: VariantWithProduct): ProductVariant {
  return {
    id: v.id,
    productId: v.productId,
    variantName: v.variantName,
    price: v.price,
    stockQuantity: v.stockQuantity,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
}

type ModalTarget = { mode: "create" } | { mode: "edit"; variant: ProductVariant };

interface PendingDelete {
  variant: ProductVariant;
  blockedReason?: string;
}

/** จัดการตัวเลือกสินค้า (ไซส์/สี + ราคา) ของสินค้าหนึ่งชิ้น — บันทึกทีละรายการทันที */
export function ProductVariantsSection({
  product,
  canEdit,
  onChange,
}: {
  product: Product;
  canEdit: boolean;
  onChange: (product: Product) => void;
}) {
  const toast = useToast();
  const [modal, setModal] = useState<ModalTarget | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const deletingRef = useRef(false);

  const variants = product.variants;

  const handleSaved = (variant: VariantWithProduct, mode: ModalTarget["mode"]) => {
    const next = toProductVariant(variant);
    onChange({
      ...product,
      variants: mode === "create" ? [...variants, next] : variants.map((v) => (v.id === next.id ? next : v)),
    });
    setModal(null);
    toast(mode === "create" ? `เพิ่มตัวเลือก “${next.variantName}” แล้ว` : `บันทึกตัวเลือก “${next.variantName}” แล้ว`);
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deletingRef.current) return;
    const { variant } = pendingDelete;
    deletingRef.current = true;
    try {
      await api.deleteVariant(variant.id);
      onChange({ ...product, variants: variants.filter((v) => v.id !== variant.id) });
      setPendingDelete(null);
      toast(`ลบตัวเลือก “${variant.variantName}” แล้ว`);
    } catch (error) {
      if (error instanceof ApiError && error.code === "UNAUTHORIZED") return;
      setPendingDelete({ variant, blockedReason: errorMessage(error) });
    } finally {
      deletingRef.current = false;
    }
  };

  return (
    <section className={cardClass} aria-labelledby="product-variants-title">
      <div className="flex flex-col gap-3 border-b border-outline-variant/40 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 id="product-variants-title" className="font-display text-headline-md text-on-surface">
            ตัวเลือกสินค้าและราคา
          </h2>
          <p className="text-body-md text-on-surface-variant">
            ปรับจำนวนคงเหลือได้ที่หน้า{" "}
            <Link href="/staff/stock" className={`text-primary-container hover:underline ${focusRing}`}>
              สต็อกและพรีออเดอร์
            </Link>
          </p>
        </div>
        {canEdit && variants.length > 0 && (
          <button type="button" onClick={() => setModal({ mode: "create" })} className={tonalButtonClass}>
            <AddIcon className="h-4 w-4" aria-hidden="true" />
            เพิ่มตัวเลือก
          </button>
        )}
      </div>

      {variants.length === 0 ? (
        <EmptyState
          icon={<InventoryIcon className="h-10 w-10" aria-hidden="true" />}
          title="ยังไม่มีตัวเลือกสินค้า"
          description="ลูกค้าจะสั่งซื้อได้เมื่อสินค้ามีตัวเลือกอย่างน้อย 1 รายการ เช่น ไซส์ M ราคา 250 บาท"
          action={
            canEdit ? (
              <button type="button" onClick={() => setModal({ mode: "create" })} className={tonalButtonClass}>
                <AddIcon className="h-4 w-4" aria-hidden="true" />
                เพิ่มตัวเลือก
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-xl border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant/40 bg-surface text-label-md text-on-surface-variant">
                <th scope="col" className={thClass}>
                  ตัวเลือก
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  ราคา
                </th>
                <th scope="col" className={`${thClass} text-right`}>
                  คงเหลือ
                </th>
                {canEdit && (
                  <th scope="col" className={`${thClass} text-right`}>
                    จัดการ
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => (
                <tr
                  key={variant.id}
                  className="border-b border-outline-variant/40 text-body-md last:border-0 hover:bg-surface/50"
                >
                  <td className={`${tdClass} font-medium text-on-surface`}>{variant.variantName}</td>
                  <td className={`${tdClass} text-right whitespace-nowrap text-on-surface-variant tabular-nums`}>
                    {formatMoney(variant.price)}
                  </td>
                  <td className={`${tdClass} text-right`}>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-on-surface tabular-nums">{formatNumber(variant.stockQuantity)}</span>
                      <StockLevelBadge quantity={variant.stockQuantity} isPreorder={product.isPreorder} />
                    </div>
                  </td>
                  {canEdit && (
                    <td className={`${tdClass} text-right whitespace-nowrap`}>
                      <button
                        type="button"
                        onClick={() => setModal({ mode: "edit", variant })}
                        aria-label={`แก้ไข ${variant.variantName}`}
                        className={`${iconButtonClass} rounded-lg ${focusRing}`}
                      >
                        <EditIcon className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete({ variant })}
                        aria-label={`ลบ ${variant.variantName}`}
                        className={`${iconDangerButtonClass} rounded-lg ${focusRing}`}
                      >
                        <DeleteIcon className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <VariantFormModal
          product={product}
          target={modal}
          onClose={() => setModal(null)}
          onSaved={(v) => handleSaved(v, modal.mode)}
        />
      )}

      {pendingDelete && (
        <ConfirmDeleteModal
          title="ลบตัวเลือกสินค้า"
          message={
            <>
              ลบตัวเลือก <strong className="text-on-surface">“{pendingDelete.variant.variantName}”</strong> ของ{" "}
              {product.name} ถาวร? ตัวเลือกที่เคยถูกสั่งซื้อแล้วจะลบไม่ได้
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

type VariantField = "variantName" | "price" | "stockQuantity";
type VariantErrors = Partial<Record<VariantField, string>>;

const VARIANT_FIELDS: VariantField[] = ["variantName", "price", "stockQuantity"];

function VariantFormModal({
  product,
  target,
  onClose,
  onSaved,
}: {
  product: Product;
  target: ModalTarget;
  onClose: () => void;
  onSaved: (variant: VariantWithProduct) => void;
}) {
  const editing = target.mode === "edit" ? target.variant : null;
  const [name, setName] = useState(editing?.variantName ?? "");
  const [price, setPrice] = useState(editing ? satangToBahtInput(editing.price) : "");
  const [stock, setStock] = useState("0");
  const [errors, setErrors] = useState<VariantErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const refs = useRef<Partial<Record<VariantField, HTMLInputElement | null>>>({});

  const validate = (field: VariantField): string | undefined => {
    if (field === "variantName") {
      const trimmed = name.trim();
      if (!trimmed) return "กรุณากรอกชื่อตัวเลือก เช่น M หรือ ดำ / L";
      if (trimmed.length > 50) return "ชื่อตัวเลือกยาวไม่เกิน 50 ตัวอักษร";
      const duplicate = product.variants.some(
        (v) => v.id !== editing?.id && v.variantName.trim().toLowerCase() === trimmed.toLowerCase(),
      );
      if (duplicate) return "สินค้านี้มีตัวเลือกชื่อนี้อยู่แล้ว";
      return undefined;
    }
    if (field === "price") {
      if (!price.trim()) return "กรุณากรอกราคา";
      if (bahtInputToSatang(price) === null) return "กรอกราคาเป็นตัวเลข ทศนิยมไม่เกิน 2 ตำแหน่ง เช่น 250 หรือ 250.50";
      return undefined;
    }
    if (editing) return undefined;
    if (!/^\d+$/.test(stock.trim())) return "จำนวนคงเหลือต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป";
    return undefined;
  };

  const blur = (field: VariantField) => setErrors((prev) => ({ ...prev, [field]: validate(field) }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setFormError(null);
    const found: VariantErrors = {};
    for (const field of VARIANT_FIELDS) {
      const message = validate(field);
      if (message) found[field] = message;
    }
    setErrors(found);
    const first = VARIANT_FIELDS.find((f) => found[f]);
    if (first) {
      refs.current[first]?.focus();
      return;
    }

    const satang = bahtInputToSatang(price) ?? 0;
    setSaving(true);
    try {
      const result = editing
        ? await api.updateVariant(editing.id, { variantName: name.trim(), price: satang })
        : await api.createVariant({
            productId: product.id,
            variantName: name.trim(),
            price: satang,
            stockQuantity: Number(stock.trim()),
          });
      onSaved(result);
    } catch (error) {
      if (error instanceof ApiError && error.code === "UNAUTHORIZED") return;
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = (field: VariantField) => `${inputClass} ${errors[field] ? "input-error" : ""}`;

  return (
    <Modal title={editing ? "แก้ไขตัวเลือกสินค้า" : "เพิ่มตัวเลือกสินค้า"} onClose={onClose}>
      <form noValidate onSubmit={submit} className="space-y-4">
        <p className="text-body-md text-on-surface-variant">
          {product.name} · ช่องที่มี * จำเป็นต้องกรอก
        </p>
        <FormField id="variant-name" label="ชื่อตัวเลือก" required hint="เช่น S, M, L หรือ ดำ / L" error={errors.variantName}>
          <input
            id="variant-name"
            ref={(el) => {
              refs.current.variantName = el;
            }}
            autoFocus
            value={name}
            maxLength={50}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => blur("variantName")}
            aria-required="true"
            aria-invalid={errors.variantName ? true : undefined}
            aria-describedby={describedBy("variant-name", "hint", errors.variantName)}
            className={fieldClass("variantName")}
          />
        </FormField>
        <FormField id="variant-price" label="ราคา (บาท)" required error={errors.price}>
          <input
            id="variant-price"
            ref={(el) => {
              refs.current.price = el;
            }}
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={() => blur("price")}
            aria-required="true"
            aria-invalid={errors.price ? true : undefined}
            aria-describedby={describedBy("variant-price", undefined, errors.price)}
            placeholder="250.00"
            className={`${fieldClass("price")} tabular-nums`}
          />
        </FormField>
        {!editing && (
          <FormField
            id="variant-stock"
            label="จำนวนคงเหลือเริ่มต้น (ชิ้น)"
            required
            hint={product.isPreorder ? "สินค้าพรีออเดอร์ใส่ 0 ได้ ลูกค้ายังสั่งได้ตามปกติ" : undefined}
            error={errors.stockQuantity}
          >
            <input
              id="variant-stock"
              ref={(el) => {
                refs.current.stockQuantity = el;
              }}
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              onBlur={() => blur("stockQuantity")}
              aria-required="true"
              aria-invalid={errors.stockQuantity ? true : undefined}
              aria-describedby={describedBy(
                "variant-stock",
                product.isPreorder ? "hint" : undefined,
                errors.stockQuantity,
              )}
              className={`${fieldClass("stockQuantity")} tabular-nums`}
            />
          </FormField>
        )}
        {formError && <Alert title="บันทึกไม่สำเร็จ">{formError}</Alert>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className={`${secondaryButtonClass} ${focusRing}`}>
            ยกเลิก
          </button>
          <LoadingButton type="submit" loading={saving} className={primaryButtonClass}>
            บันทึก
          </LoadingButton>
        </div>
      </form>
    </Modal>
  );
}
