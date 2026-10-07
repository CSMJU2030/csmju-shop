"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowBackIcon, cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from "@/csmju";
import { ApiError, api } from "@/lib/api";
import type { CreateProductBody, Product, UpdateProductBody } from "@/lib/types";
import { ApiErrorView, errorMessage } from "@/components/shared/api-error-view";
import { FormField, describedBy } from "@/components/shared/form-field";
import { ProductArt } from "@/components/shared/product-art";
import { UploadIcon } from "@/components/shared/shop-icons";
import { Alert, SkeletonBar } from "@/components/shared/states";
import { useToast } from "@/components/shared/toast";
import { ProductVariantsSection } from "./products-variants";
import { LoadingButton, focusRing } from "./products-ui";

// ── รูปสินค้า ───────────────────────────────────────────────

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const UPLOAD_URL_PATTERN = /^\/uploads\/products\/([0-9a-f-]{36})\.[a-z0-9]+$/i;

/** id ของรูป = ชื่อไฟล์ UUID ใน /uploads/products/<uuid>.<ext> · URL อื่น (ไม่ได้อัปโหลดผ่านระบบ) คืน null */
export function imageIdFromUrl(url: string | null | undefined): string | null {
  const match = url ? UPLOAD_URL_PATTERN.exec(url) : null;
  return match ? match[1] : null;
}

/** ลบไฟล์รูปที่ไม่ได้ใช้แล้ว — ลบไม่สำเร็จ (เช่น ไฟล์หายไปก่อนแล้ว) ไม่กระทบงานหลัก */
export async function deleteUploadedImage(url: string): Promise<void> {
  const id = imageIdFromUrl(url);
  if (!id) return;
  try {
    await api.deleteImage(id);
  } catch {
    // ไม่ต้องแจ้งผู้ใช้ — ไฟล์ค้างในเครื่องไม่ทำให้ร้านค้าใช้งานไม่ได้
  }
}

// ── วันที่ ─────────────────────────────────────────────────

const bangkokDateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** ISO 8601 → YYYY-MM-DD ตามเวลาไทย (ค่าสำหรับ <input type="date"> ไม่ใช่การแสดงผล) */
function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : bangkokDateFmt.format(d);
}

/** YYYY-MM-DD → ISO 8601 เวลา 23:59:59 ของวันนั้นตามเวลาไทย (ปิดรับเมื่อสิ้นวัน) */
function dateInputToIso(date: string): string {
  return new Date(`${date}T23:59:59+07:00`).toISOString();
}

// ── ฟอร์ม ─────────────────────────────────────────────────

interface FormState {
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  isPreorder: boolean;
  preorderEndDate: string;
  estimatedDelivery: string;
}

type FieldKey = "image" | "name" | "category" | "description" | "preorderEndDate" | "estimatedDelivery";
type FieldErrors = Partial<Record<FieldKey, string>>;

const FIELD_ORDER: FieldKey[] = ["image", "name", "category", "description", "preorderEndDate", "estimatedDelivery"];

const FIELD_ID: Record<FieldKey, string> = {
  image: "product-image",
  name: "product-name",
  category: "product-category",
  description: "product-description",
  preorderEndDate: "product-preorder-end",
  estimatedDelivery: "product-estimated-delivery",
};

/** ชื่อฟิลด์ที่ backend ส่งมาใน error.details → ช่องบนฟอร์ม */
const API_FIELD: Record<string, FieldKey> = {
  name: "name",
  category: "category",
  description: "description",
  imageUrl: "image",
  preorderEndDate: "preorderEndDate",
  estimatedDelivery: "estimatedDelivery",
};

const EMPTY_FORM: FormState = {
  name: "",
  category: "",
  description: "",
  imageUrl: "",
  isPreorder: false,
  preorderEndDate: "",
  estimatedDelivery: "",
};

function toForm(p: Product): FormState {
  return {
    name: p.name,
    category: p.category,
    description: p.description ?? "",
    imageUrl: p.imageUrl ?? "",
    isPreorder: p.isPreorder,
    preorderEndDate: isoToDateInput(p.preorderEndDate),
    estimatedDelivery: p.estimatedDelivery ?? "",
  };
}

function validateField(key: FieldKey, form: FormState, saved: Product | null): string | undefined {
  switch (key) {
    case "name":
      if (!form.name.trim()) return "กรุณากรอกชื่อสินค้า";
      if (form.name.trim().length > 150) return "ชื่อสินค้ายาวไม่เกิน 150 ตัวอักษร";
      return undefined;
    case "category":
      if (!form.category.trim()) return "กรุณาระบุหมวดหมู่ เช่น เสื้อ หรือ ของที่ระลึก";
      if (form.category.trim().length > 50) return "หมวดหมู่ยาวไม่เกิน 50 ตัวอักษร";
      return undefined;
    case "preorderEndDate":
      if (form.isPreorder && !form.preorderEndDate) return "สินค้าพรีออเดอร์ต้องระบุวันปิดรับพรีออเดอร์";
      return undefined;
    case "estimatedDelivery":
      if (!form.estimatedDelivery && saved?.estimatedDelivery) {
        return "ลบวันที่คาดว่าจะได้รับสินค้าออกไม่ได้ กรุณาระบุวันที่ใหม่แทน";
      }
      if (form.isPreorder && form.estimatedDelivery && form.preorderEndDate && form.estimatedDelivery < form.preorderEndDate) {
        return "วันที่คาดว่าจะได้รับสินค้าต้องไม่ก่อนวันปิดรับพรีออเดอร์";
      }
      return undefined;
    default:
      return undefined;
  }
}

function validateAll(form: FormState, saved: Product | null): FieldErrors {
  const errors: FieldErrors = {};
  for (const key of FIELD_ORDER) {
    const message = validateField(key, form, saved);
    if (message) errors[key] = message;
  }
  return errors;
}

/** จับคู่ error.details ของ VALIDATION_ERROR กับช่องบนฟอร์ม (details ขึ้นต้นด้วยชื่อฟิลด์ของ API) */
function fieldErrorsFromApi(error: ApiError): FieldErrors {
  const errors: FieldErrors = {};
  for (const detail of error.details) {
    const apiField = Object.keys(API_FIELD).find((f) => detail.startsWith(`${f} `) || detail.startsWith(`${f}:`));
    if (apiField) errors[API_FIELD[apiField]] = error.message;
  }
  return errors;
}

type LoadState = { status: "loading" } | { status: "error"; error: unknown } | { status: "ready" };

export function ProductEditor({
  productId,
  categories,
  canEditVariants,
  onDone,
}: {
  /** null = เพิ่มสินค้าใหม่ */
  productId: string | null;
  categories: string[];
  canEditVariants: boolean;
  onDone: () => void;
}) {
  const toast = useToast();
  const [load, setLoad] = useState<LoadState>(productId ? { status: "loading" } : { status: "ready" });
  const [reloadKey, setReloadKey] = useState(0);
  const [saved, setSaved] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fieldRefs = useRef<Partial<Record<FieldKey, HTMLElement | null>>>({});
  /** รูปที่อัปโหลดในรอบนี้แต่ยังไม่ได้บันทึกลงสินค้า — ถ้าไม่ได้ใช้ต้องลบทิ้ง */
  const pendingUploads = useRef<Set<string>>(new Set());
  const savedImageRef = useRef<string | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    setLoad({ status: "loading" });
    api
      .getProduct(productId)
      .then((product) => {
        if (cancelled) return;
        setSaved(product);
        setForm(toForm(product));
        setLoad({ status: "ready" });
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoad({ status: "error", error });
      });
    return () => {
      cancelled = true;
    };
  }, [productId, reloadKey]);

  useEffect(() => {
    savedImageRef.current = saved?.imageUrl ?? null;
  }, [saved]);

  // ออกจากหน้าโดยไม่บันทึก → ลบรูปที่อัปโหลดค้างไว้
  useEffect(() => {
    const uploads = pendingUploads.current;
    return () => {
      for (const url of uploads) {
        if (url !== savedImageRef.current) void deleteUploadedImage(url);
      }
      uploads.clear();
    };
  }, []);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const blurValidate = (key: FieldKey) => {
    setErrors((prev) => ({ ...prev, [key]: validateField(key, form, saved) }));
  };

  const discardPendingUpload = (url: string) => {
    if (pendingUploads.current.has(url)) {
      pendingUploads.current.delete(url);
      void deleteUploadedImage(url);
    }
  };

  const pickImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // เลือกไฟล์เดิมซ้ำได้
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setErrors((prev) => ({ ...prev, image: "รองรับเฉพาะไฟล์รูป JPG, PNG, WEBP และ GIF" }));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrors((prev) => ({ ...prev, image: "ไฟล์รูปต้องมีขนาดไม่เกิน 5MB" }));
      return;
    }
    setErrors((prev) => ({ ...prev, image: undefined }));
    setUploading(true);
    try {
      const image = await api.uploadImage(file);
      const previous = form.imageUrl;
      if (previous) discardPendingUpload(previous);
      pendingUploads.current.add(image.url);
      setField("imageUrl", image.url);
    } catch (error) {
      if (!(error instanceof ApiError && error.code === "UNAUTHORIZED")) {
        setErrors((prev) => ({ ...prev, image: errorMessage(error) }));
      }
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    if (form.imageUrl) discardPendingUpload(form.imageUrl);
    setField("imageUrl", "");
    setErrors((prev) => ({ ...prev, image: undefined }));
  };

  const focusFirstError = (found: FieldErrors) => {
    const first = FIELD_ORDER.find((key) => found[key]);
    if (!first) return;
    const el = first === "image" ? fileRef.current?.parentElement?.querySelector("button") : fieldRefs.current[first];
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.focus();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || uploading) return;
    setFormError(null);

    const found = validateAll(form, saved);
    setErrors(found);
    const count = Object.values(found).filter(Boolean).length;
    if (count > 0) {
      setAnnounce(`กรอกข้อมูลไม่ครบหรือไม่ถูกต้อง ${count} ช่อง`);
      focusFirstError(found);
      return;
    }
    setAnnounce("");

    const name = form.name.trim();
    const category = form.category.trim();
    const description = form.description.trim();
    const preorderEndDate = form.isPreorder && form.preorderEndDate ? dateInputToIso(form.preorderEndDate) : undefined;
    const estimatedDelivery = form.estimatedDelivery || undefined;

    setSaving(true);
    try {
      let result: Product;
      if (saved) {
        const body: UpdateProductBody = {
          name,
          category,
          description,
          imageUrl: form.imageUrl,
          isPreorder: form.isPreorder,
          preorderEndDate,
          estimatedDelivery,
        };
        result = await api.updateProduct(saved.id, body);
      } else {
        const body: CreateProductBody = {
          name,
          category,
          description: description || undefined,
          imageUrl: form.imageUrl || undefined,
          isPreorder: form.isPreorder,
          preorderEndDate,
          estimatedDelivery,
        };
        result = await api.createProduct(body);
      }

      // รูปเดิมที่ถูกแทนที่/เอาออก และรูปที่อัปโหลดแล้วไม่ได้ใช้ → ลบไฟล์ทิ้ง
      const previousImage = saved?.imageUrl ?? null;
      if (previousImage && previousImage !== result.imageUrl) void deleteUploadedImage(previousImage);
      for (const url of pendingUploads.current) {
        if (url !== result.imageUrl) void deleteUploadedImage(url);
      }
      pendingUploads.current.clear();

      if (saved) {
        toast(`บันทึกสินค้า “${result.name}” แล้ว`);
        savedImageRef.current = result.imageUrl;
        onDone();
        return;
      }
      toast(`เพิ่มสินค้า “${result.name}” แล้ว เพิ่มตัวเลือกสินค้าต่อได้ด้านล่าง`);
      setSaved(result);
      setForm(toForm(result));
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "UNAUTHORIZED") return;
        if (error.code === "VALIDATION_ERROR") {
          const mapped = fieldErrorsFromApi(error);
          setErrors((prev) => ({ ...prev, ...mapped }));
          focusFirstError(mapped);
        }
      }
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    for (const url of pendingUploads.current) {
      if (url !== saved?.imageUrl) void deleteUploadedImage(url);
    }
    pendingUploads.current.clear();
    onDone();
  };

  const title = productId !== null || saved ? "แก้ไขสินค้า" : "เพิ่มสินค้า";

  return (
    <div className="space-y-8">
      <section className={cardClass} aria-labelledby="product-editor-title">
        <div className="flex flex-col gap-3 border-b border-outline-variant/40 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <h2
            id="product-editor-title"
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-headline-md text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
          >
            {title}
            {saved && <span className="block text-body-md text-on-surface-variant">{saved.name}</span>}
          </h2>
          <button
            type="button"
            onClick={cancel}
            className={`${secondaryButtonClass} ${focusRing} flex items-center justify-center gap-2`}
          >
            <ArrowBackIcon className="h-4 w-4" aria-hidden="true" />
            กลับไปรายการสินค้า
          </button>
        </div>

        {load.status === "loading" && (
          <div aria-busy="true" aria-live="polite" className="grid gap-6 p-6 md:grid-cols-3">
            <span className="sr-only">กำลังโหลดข้อมูล...</span>
            <SkeletonBar className="aspect-square w-full" />
            <div className="space-y-4 md:col-span-2">
              <SkeletonBar className="h-11" />
              <SkeletonBar className="h-11" />
              <SkeletonBar className="h-24" />
              <SkeletonBar className="h-11 w-1/2" />
            </div>
          </div>
        )}

        {load.status === "error" && (
          <ApiErrorView error={load.error} onRetry={() => setReloadKey((k) => k + 1)} />
        )}

        {load.status === "ready" && (
          <form noValidate onSubmit={submit} className="space-y-6 p-6">
            <p className="text-body-md text-on-surface-variant">ช่องที่มี * จำเป็นต้องกรอก</p>
            <p aria-live="assertive" className="sr-only">
              {announce}
            </p>

            <div className="grid gap-6 md:grid-cols-3">
              {/* รูปสินค้า */}
              <div className="space-y-3">
                <FormField
                  id={FIELD_ID.image}
                  label="รูปสินค้า"
                  hint="JPG, PNG, WEBP หรือ GIF ไม่เกิน 5MB · ไม่ใส่ก็ได้ ระบบจะแสดงภาพตามหมวดหมู่แทน"
                  error={errors.image}
                >
                  <ProductArt
                    name={form.name || "รูปสินค้า"}
                    category={form.category}
                    src={form.imageUrl || null}
                    sizes="(min-width: 768px) 30vw, 100vw"
                    className="aspect-square w-full rounded-xl border border-outline-variant/40"
                  />
                  <input
                    ref={fileRef}
                    id={FIELD_ID.image}
                    type="file"
                    accept={IMAGE_TYPES.join(",")}
                    tabIndex={-1}
                    onChange={pickImage}
                    aria-describedby={describedBy(FIELD_ID.image, "hint", errors.image)}
                    className="sr-only"
                  />
                  <div className="flex flex-wrap gap-3">
                    <LoadingButton
                      loading={uploading}
                      disabled={saving}
                      onClick={() => fileRef.current?.click()}
                      className={primaryButtonClass}
                    >
                      <UploadIcon className="h-4 w-4" />
                      {form.imageUrl ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
                    </LoadingButton>
                    {form.imageUrl && (
                      <button
                        type="button"
                        onClick={removeImage}
                        disabled={uploading || saving}
                        className={`${secondaryButtonClass} ${focusRing} disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        ลบรูป
                      </button>
                    )}
                  </div>
                </FormField>
              </div>

              {/* ข้อมูลสินค้า */}
              <div className="space-y-4 md:col-span-2">
                <FormField id={FIELD_ID.name} label="ชื่อสินค้า" required error={errors.name}>
                  <input
                    id={FIELD_ID.name}
                    ref={(el) => {
                      fieldRefs.current.name = el;
                    }}
                    value={form.name}
                    maxLength={150}
                    onChange={(e) => setField("name", e.target.value)}
                    onBlur={() => blurValidate("name")}
                    aria-required="true"
                    aria-invalid={errors.name ? true : undefined}
                    aria-describedby={describedBy(FIELD_ID.name, undefined, errors.name)}
                    placeholder="เช่น เสื้อโปโลสาขาวิทยาการคอมพิวเตอร์"
                    className={`${inputClass} ${errors.name ? "input-error" : ""}`}
                  />
                </FormField>

                <FormField
                  id={FIELD_ID.category}
                  label="หมวดหมู่"
                  required
                  hint="เลือกหมวดหมู่ที่มีอยู่หรือพิมพ์หมวดหมู่ใหม่"
                  error={errors.category}
                >
                  <input
                    id={FIELD_ID.category}
                    ref={(el) => {
                      fieldRefs.current.category = el;
                    }}
                    list="product-category-options"
                    value={form.category}
                    maxLength={50}
                    onChange={(e) => setField("category", e.target.value)}
                    onBlur={() => blurValidate("category")}
                    aria-required="true"
                    aria-invalid={errors.category ? true : undefined}
                    aria-describedby={describedBy(FIELD_ID.category, "hint", errors.category)}
                    className={`${inputClass} ${errors.category ? "input-error" : ""}`}
                  />
                  <datalist id="product-category-options">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </FormField>

                <FormField id={FIELD_ID.description} label="รายละเอียด" error={errors.description}>
                  <textarea
                    id={FIELD_ID.description}
                    ref={(el) => {
                      fieldRefs.current.description = el;
                    }}
                    rows={3}
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    aria-invalid={errors.description ? true : undefined}
                    aria-describedby={describedBy(FIELD_ID.description, undefined, errors.description)}
                    className={`${inputClass} ${errors.description ? "input-error" : ""}`}
                  />
                </FormField>

                <fieldset className="space-y-4 rounded-xl border border-outline-variant/40 p-4">
                  <legend className="px-1 text-label-md text-on-surface">การสั่งซื้อ</legend>
                  <label className="flex items-start gap-3 text-body-md text-on-surface">
                    <input
                      type="checkbox"
                      checked={form.isPreorder}
                      onChange={(e) => {
                        setField("isPreorder", e.target.checked);
                        if (!e.target.checked) setErrors((prev) => ({ ...prev, preorderEndDate: undefined }));
                      }}
                      className="mt-1 h-4 w-4 shrink-0 accent-primary"
                    />
                    <span>
                      เป็นสินค้าพรีออเดอร์
                      <span className="block text-on-surface-variant">
                        ลูกค้าสั่งได้แม้สต็อกเป็น 0 ยอดที่เกินสต็อกจะนับเป็นยอดค้างผลิต
                      </span>
                    </span>
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    {form.isPreorder && (
                      <FormField
                        id={FIELD_ID.preorderEndDate}
                        label="วันปิดรับพรีออเดอร์"
                        required
                        hint="ปิดรับเมื่อสิ้นวันนั้น (23:59 น.)"
                        error={errors.preorderEndDate}
                      >
                        <input
                          id={FIELD_ID.preorderEndDate}
                          ref={(el) => {
                            fieldRefs.current.preorderEndDate = el;
                          }}
                          type="date"
                          value={form.preorderEndDate}
                          onChange={(e) => setField("preorderEndDate", e.target.value)}
                          onBlur={() => blurValidate("preorderEndDate")}
                          aria-required="true"
                          aria-invalid={errors.preorderEndDate ? true : undefined}
                          aria-describedby={describedBy(FIELD_ID.preorderEndDate, "hint", errors.preorderEndDate)}
                          className={`${inputClass} ${errors.preorderEndDate ? "input-error" : ""}`}
                        />
                      </FormField>
                    )}
                    <FormField
                      id={FIELD_ID.estimatedDelivery}
                      label="วันที่คาดว่าจะได้รับสินค้า"
                      hint="ไม่บังคับ"
                      error={errors.estimatedDelivery}
                    >
                      <input
                        id={FIELD_ID.estimatedDelivery}
                        ref={(el) => {
                          fieldRefs.current.estimatedDelivery = el;
                        }}
                        type="date"
                        value={form.estimatedDelivery}
                        onChange={(e) => setField("estimatedDelivery", e.target.value)}
                        onBlur={() => blurValidate("estimatedDelivery")}
                        aria-invalid={errors.estimatedDelivery ? true : undefined}
                        aria-describedby={describedBy(FIELD_ID.estimatedDelivery, "hint", errors.estimatedDelivery)}
                        className={`${inputClass} ${errors.estimatedDelivery ? "input-error" : ""}`}
                      />
                    </FormField>
                  </div>
                </fieldset>
              </div>
            </div>

            {formError && <Alert title="บันทึกไม่สำเร็จ">{formError}</Alert>}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={cancel} className={`${secondaryButtonClass} ${focusRing}`}>
                ยกเลิก
              </button>
              <LoadingButton type="submit" loading={saving} disabled={uploading} className={primaryButtonClass}>
                บันทึก
              </LoadingButton>
            </div>
          </form>
        )}
      </section>

      {saved && load.status === "ready" && (
        <ProductVariantsSection product={saved} canEdit={canEditVariants} onChange={setSaved} />
      )}
    </div>
  );
}
