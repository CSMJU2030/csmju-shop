"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  AddIcon,
  ConfirmDeleteModal,
  DeleteIcon,
  LocationIcon,
  MinusIcon,
  PageHeader,
  StatusBadge,
  cardClass,
  iconButtonClass,
  iconDangerButtonClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/csmju";
import { errorMessage } from "@/components/shared/api-error-view";
import { FormField, describedBy } from "@/components/shared/form-field";
import { ProductArt } from "@/components/shared/product-art";
import { LocalShippingIcon, ShoppingBagIcon } from "@/components/shared/shop-icons";
import { Alert, EmptyState } from "@/components/shared/states";
import { useToast } from "@/components/shared/toast";
import { ApiError, api } from "@/lib/api";
import { useCart, type CartLine } from "@/lib/cart";
import { formatMoney, formatNumber } from "@/lib/format";
import { DELIVERY_METHOD_LABEL } from "@/lib/status";
import type { DeliveryMethod, Order } from "@/lib/types";
import { cardHeaderClass, cardTitleClass, focusRing } from "./shop-ui";
import { CheckoutSkeleton } from "./skeletons";

/** ค่าจัดส่งที่แจ้งลูกค้าล่วงหน้า (สตางค์) — ยอดจริงคำนวณโดย backend ตอนสั่งซื้อ หน้าเว็บไม่ส่งค่านี้ไป */
const SHIPPING_FEE_NOTICE = 5000;

type Field = "recipientName" | "recipientPhone" | "shippingAddress" | "paymentSlip";
const FIELD_ORDER: Field[] = ["recipientName", "recipientPhone", "shippingAddress", "paymentSlip"];
const FIELD_ID: Record<Field, string> = {
  recipientName: "checkout-recipient-name",
  recipientPhone: "checkout-recipient-phone",
  shippingAddress: "checkout-shipping-address",
  paymentSlip: "checkout-payment-slip",
};

interface Values {
  deliveryMethod: DeliveryMethod;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  paymentSlip: string;
}

function validate(field: Field, v: Values): string | null {
  switch (field) {
    case "recipientName": {
      const name = v.recipientName.trim();
      if (!name) return "กรุณากรอกชื่อผู้รับ";
      if (name.length > 100) return "ชื่อผู้รับยาวได้ไม่เกิน 100 ตัวอักษร";
      return null;
    }
    case "recipientPhone":
      if (!v.recipientPhone) return "กรุณากรอกเบอร์โทรศัพท์ผู้รับ";
      if (!/^0\d{8,9}$/.test(v.recipientPhone)) return "เบอร์โทรศัพท์ต้องเป็นตัวเลข 9–10 หลักและขึ้นต้นด้วย 0";
      return null;
    case "shippingAddress":
      if (v.deliveryMethod !== "DELIVERY") return null;
      if (!v.shippingAddress.trim()) return "การจัดส่งพัสดุต้องระบุที่อยู่จัดส่ง";
      if (v.shippingAddress.trim().length > 500) return "ที่อยู่จัดส่งยาวได้ไม่เกิน 500 ตัวอักษร";
      return null;
    case "paymentSlip":
      if (v.paymentSlip.trim().length > 255) return "ลิงก์หรือชื่อไฟล์สลิปยาวได้ไม่เกิน 255 ตัวอักษร";
      return null;
  }
}

/** VALIDATION_ERROR จาก backend ไม่มี details.field — หาฟิลด์จากชื่อที่อยู่ในข้อความ */
function fieldOf(error: ApiError): Field | null {
  const text = [error.message, ...error.details].join(" ");
  return FIELD_ORDER.find((f) => text.includes(f)) ?? null;
}

interface FormError {
  title?: string;
  message: string;
  hint?: string;
}

function CartLineRow({
  line,
  onQuantity,
  onRemove,
}: {
  line: CartLine;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const label = `${line.productName} (${line.variantName})`;
  return (
    <li className="flex flex-col gap-4 border-b border-outline-variant/40 px-6 py-4 last:border-0 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 gap-4">
        <ProductArt
          name={line.productName}
          category={line.category}
          src={line.imageUrl}
          className="h-20 w-20 shrink-0 rounded-lg"
          sizes="80px"
        />
        <div className="min-w-0 space-y-1">
          <p className="text-body-md font-semibold text-on-surface">{line.productName}</p>
          <p className="text-body-md text-on-surface-variant">
            {line.variantName} · <span className="tabular-nums">{formatMoney(line.price)}</span> ต่อชิ้น
          </p>
          {line.isPreorder && <StatusBadge tone="info" label="พรีออเดอร์" />}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 md:justify-end">
        <div className="flex items-center gap-1" role="group" aria-label={`จำนวน ${label}`}>
          <button
            type="button"
            className={`${iconButtonClass} flex min-h-11 min-w-11 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-40 md:min-h-0 md:min-w-0 ${focusRing}`}
            aria-label={`ลดจำนวน ${label}`}
            disabled={line.quantity <= 1}
            onClick={() => onQuantity(line.quantity - 1)}
          >
            <MinusIcon className="h-5 w-5" />
          </button>
          <span className="w-10 text-center text-body-md text-on-surface tabular-nums" aria-live="polite">
            {formatNumber(line.quantity)}
          </span>
          <button
            type="button"
            className={`${iconButtonClass} flex min-h-11 min-w-11 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-40 md:min-h-0 md:min-w-0 ${focusRing}`}
            aria-label={`เพิ่มจำนวน ${label}`}
            disabled={line.quantity >= 99}
            onClick={() => onQuantity(line.quantity + 1)}
          >
            <AddIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="w-32 text-right text-body-md font-semibold text-on-surface tabular-nums">
          {formatMoney(line.price * line.quantity)}
        </p>
        <button
          type="button"
          className={`${iconDangerButtonClass} flex min-h-11 min-w-11 items-center justify-center rounded-lg md:min-h-0 md:min-w-0 ${focusRing}`}
          aria-label={`ลบ ${label} ออกจากตะกร้า`}
          onClick={onRemove}
        >
          <DeleteIcon className="h-5 w-5" />
        </button>
      </div>
    </li>
  );
}

function PlacedSummary({ order }: { order: Order }) {
  return (
    <div className="space-y-8">
      <PageHeader title="สั่งซื้อสำเร็จ" description={`เลขที่คำสั่งซื้อ ${order.orderNumber}`} />
      <div className={`${cardClass} space-y-4 p-6`} role="status">
        <dl className="space-y-2 text-body-md">
          <div className="flex justify-between gap-3">
            <dt className="text-on-surface-variant">ราคาสินค้า</dt>
            <dd className="tabular-nums">{formatMoney(order.totalAmount - order.shippingFee)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-on-surface-variant">ค่าจัดส่ง</dt>
            <dd className="tabular-nums">{formatMoney(order.shippingFee)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-outline-variant/40 pt-2">
            <dt className="font-semibold text-on-surface">ยอดที่ต้องชำระ</dt>
            <dd className="font-semibold text-primary-container tabular-nums">{formatMoney(order.totalAmount)}</dd>
          </div>
        </dl>
        <p className="text-body-md text-on-surface-variant">กำลังพาไปหน้ารายละเอียดคำสั่งซื้อ...</p>
        <div className="flex justify-end">
          <Link href={`/orders/${order.id}`} className={`${secondaryButtonClass} ${focusRing}`}>
            ดูรายละเอียด
          </Link>
        </div>
      </div>
    </div>
  );
}

export function CheckoutView() {
  const { lines, ready, count, subtotal, setQuantity, remove, clear } = useCart();
  const router = useRouter();
  const toast = useToast();

  const [values, setValues] = useState<Values>({
    deliveryMethod: "PICKUP",
    recipientName: "",
    recipientPhone: "",
    shippingAddress: "",
    paymentSlip: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [announce, setAnnounce] = useState("");
  const [formError, setFormError] = useState<FormError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState<Order | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CartLine | null>(null);

  const setValue = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    // แก้ช่องที่เคยผิดแล้ว → ลบข้อความ error ของช่องนั้นเมื่อถูกต้อง
    if (key !== "deliveryMethod" && errors[key as Field]) {
      const next = { ...values, [key]: value };
      setErrors((prev) => ({ ...prev, [key]: validate(key as Field, next) ?? undefined }));
    }
  };

  const onBlur = (field: Field) => {
    setErrors((prev) => ({ ...prev, [field]: validate(field, values) ?? undefined }));
  };

  const focusField = (field: Field) => document.getElementById(FIELD_ID[field])?.focus();

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);

    const nextErrors: Partial<Record<Field, string>> = {};
    for (const field of FIELD_ORDER) {
      const message = validate(field, values);
      if (message) nextErrors[field] = message;
    }
    setErrors(nextErrors);
    const invalid = FIELD_ORDER.filter((f) => nextErrors[f]);
    if (invalid.length > 0) {
      setAnnounce(`กรอกข้อมูลไม่ถูกต้อง ${formatNumber(invalid.length)} ช่อง`);
      focusField(invalid[0]);
      return;
    }
    setAnnounce("");

    setSubmitting(true);
    try {
      const slip = values.paymentSlip.trim();
      const order = await api.createOrder({
        deliveryMethod: values.deliveryMethod,
        recipientName: values.recipientName.trim(),
        recipientPhone: values.recipientPhone,
        ...(values.deliveryMethod === "DELIVERY" ? { shippingAddress: values.shippingAddress.trim() } : {}),
        ...(slip ? { paymentSlip: slip } : {}),
        items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
      });
      setPlaced(order);
      clear();
      toast(`สั่งซื้อสำเร็จ เลขที่ ${order.orderNumber} ยอดที่ต้องชำระ ${formatMoney(order.totalAmount)}`);
      router.push(`/orders/${order.id}`);
    } catch (error) {
      setSubmitting(false);
      if (!(error instanceof ApiError)) {
        setFormError({ message: errorMessage(error) });
        return;
      }
      switch (error.code) {
        case "UNAUTHORIZED":
          return;
        case "VALIDATION_ERROR": {
          const field = fieldOf(error);
          if (field) {
            setErrors((prev) => ({ ...prev, [field]: error.message }));
            setAnnounce("กรอกข้อมูลไม่ถูกต้อง 1 ช่อง");
            focusField(field);
          } else {
            setFormError({ title: "ข้อมูลไม่ถูกต้อง", message: error.message });
          }
          return;
        }
        case "CONFLICT":
          setFormError({
            title: "สั่งซื้อไม่สำเร็จ",
            message: error.message,
            hint: "กรุณาลดจำนวนหรือลบรายการนั้นออกจากตะกร้า แล้วสั่งซื้ออีกครั้ง",
          });
          return;
        case "NOT_FOUND":
          setFormError({
            title: "สั่งซื้อไม่สำเร็จ",
            message: error.message,
            hint: "สินค้าบางรายการถูกนำออกจากร้านแล้ว กรุณาลบรายการนั้นออกจากตะกร้าแล้วเลือกสินค้าใหม่",
          });
          return;
        default:
          setFormError({ message: errorMessage(error) });
      }
    }
  };

  if (placed) return <PlacedSummary order={placed} />;
  // รออ่านตะกร้าจากเบราว์เซอร์ก่อน ไม่งั้นจะเห็น "ตะกร้าว่าง" แวบหนึ่ง
  if (!ready) return <CheckoutSkeleton />;

  const header = (
    <PageHeader
      title="สั่งซื้อสินค้า"
      description="ตรวจสอบรายการในตะกร้า เลือกวิธีรับสินค้า แล้วกรอกข้อมูลผู้รับ"
    />
  );

  if (lines.length === 0) {
    return (
      <div className="space-y-8">
        {header}
        <div className={cardClass}>
          <EmptyState
            icon={<ShoppingBagIcon className="h-10 w-10" />}
            title="ยังไม่มีสินค้าในตะกร้า"
            description="เลือกสินค้าจากหน้าร้านค้า แล้วกลับมาที่หน้านี้เพื่อสั่งซื้อ"
            action={
              <Link href="/" className={`${primaryButtonClass} ${focusRing}`}>
                ไปเลือกสินค้า
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const isDelivery = values.deliveryMethod === "DELIVERY";
  const methodOptions: { value: DeliveryMethod; description: string; fee: string }[] = [
    {
      value: "PICKUP",
      description: "รับสินค้าด้วยตัวเองที่จุดรับสินค้าของสาขา แสดง QR ในหน้าคำสั่งซื้อให้เจ้าหน้าที่สแกน",
      fee: "ไม่มีค่าจัดส่ง",
    },
    {
      value: "DELIVERY",
      description: "ส่งพัสดุไปตามที่อยู่ที่กรอก ติดตามเลขพัสดุได้ในหน้าคำสั่งซื้อ",
      fee: `ค่าจัดส่ง ${formatMoney(SHIPPING_FEE_NOTICE)}`,
    },
  ];

  return (
    <div className="space-y-8">
      {header}

      <form noValidate onSubmit={submit} className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <section className={cardClass} aria-labelledby="checkout-cart-title">
            <div className={`${cardHeaderClass} flex items-center justify-between gap-3`}>
              <h2 id="checkout-cart-title" className={cardTitleClass}>
                รายการในตะกร้า
              </h2>
              <span className="text-body-md text-on-surface-variant tabular-nums">
                {formatNumber(lines.length)} รายการ · {formatNumber(count)} ชิ้น
              </span>
            </div>
            <ul>
              {lines.map((line) => (
                <CartLineRow
                  key={line.variantId}
                  line={line}
                  onQuantity={(q) => setQuantity(line.variantId, q)}
                  onRemove={() => setRemoveTarget(line)}
                />
              ))}
            </ul>
          </section>

          <section className={cardClass} aria-labelledby="checkout-method-title">
            <div className={cardHeaderClass}>
              <h2 id="checkout-method-title" className={cardTitleClass}>
                วิธีรับสินค้า
              </h2>
            </div>
            <fieldset className="space-y-3 p-6">
              <legend className="sr-only">เลือกวิธีรับสินค้า</legend>
              {methodOptions.map((option) => {
                const checked = values.deliveryMethod === option.value;
                const Icon = option.value === "PICKUP" ? LocationIcon : LocalShippingIcon;
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors ${
                      checked
                        ? "border-primary-container bg-primary-container/10"
                        : "border-outline-variant hover:bg-surface-variant/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value={option.value}
                      checked={checked}
                      onChange={() => {
                        setValue("deliveryMethod", option.value);
                        if (option.value === "PICKUP") setErrors((prev) => ({ ...prev, shippingAddress: undefined }));
                      }}
                      className={`mt-1 h-4 w-4 shrink-0 accent-primary-container ${focusRing}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-label-md text-on-surface">
                          <Icon className="h-5 w-5 text-primary-container" />
                          {DELIVERY_METHOD_LABEL[option.value]}
                        </span>
                        <span className="text-label-md text-on-surface-variant tabular-nums">{option.fee}</span>
                      </span>
                      <span className="mt-1 block text-body-md text-on-surface-variant">{option.description}</span>
                    </span>
                  </label>
                );
              })}
              {isDelivery && (
                <Alert tone="info">
                  ค่าจัดส่ง {formatMoney(SHIPPING_FEE_NOTICE)} ระบบจะคำนวณและรวมในยอดชำระให้เมื่อสั่งซื้อ
                </Alert>
              )}
            </fieldset>
          </section>

          <section className={cardClass} aria-labelledby="checkout-recipient-title">
            <div className={cardHeaderClass}>
              <h2 id="checkout-recipient-title" className={cardTitleClass}>
                ข้อมูลผู้รับ
              </h2>
              <p className="mt-1 text-body-md text-on-surface-variant">ช่องที่มี * จำเป็นต้องกรอก</p>
            </div>
            <div className="space-y-4 p-6">
              <FormField id={FIELD_ID.recipientName} label="ชื่อผู้รับ" required error={errors.recipientName}>
                <input
                  id={FIELD_ID.recipientName}
                  type="text"
                  autoComplete="name"
                  maxLength={100}
                  value={values.recipientName}
                  onChange={(e) => setValue("recipientName", e.target.value)}
                  onBlur={() => onBlur("recipientName")}
                  aria-required="true"
                  aria-invalid={errors.recipientName ? true : undefined}
                  aria-describedby={describedBy(FIELD_ID.recipientName, undefined, errors.recipientName)}
                  className={`${inputClass} ${errors.recipientName ? "input-error" : ""}`}
                />
              </FormField>

              <FormField
                id={FIELD_ID.recipientPhone}
                label="เบอร์โทรศัพท์ผู้รับ"
                required
                hint="ตัวเลขล้วน 9–10 หลัก ขึ้นต้นด้วย 0"
                error={errors.recipientPhone}
              >
                <input
                  id={FIELD_ID.recipientPhone}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={values.recipientPhone}
                  onChange={(e) => setValue("recipientPhone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  onBlur={() => onBlur("recipientPhone")}
                  aria-required="true"
                  aria-invalid={errors.recipientPhone ? true : undefined}
                  aria-describedby={describedBy(
                    FIELD_ID.recipientPhone,
                    "ตัวเลขล้วน 9–10 หลัก ขึ้นต้นด้วย 0",
                    errors.recipientPhone,
                  )}
                  className={`${inputClass} tabular-nums ${errors.recipientPhone ? "input-error" : ""}`}
                />
              </FormField>

              {isDelivery && (
                <FormField
                  id={FIELD_ID.shippingAddress}
                  label="ที่อยู่จัดส่ง"
                  required
                  hint="บ้านเลขที่ หมู่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
                  error={errors.shippingAddress}
                >
                  <textarea
                    id={FIELD_ID.shippingAddress}
                    rows={4}
                    autoComplete="street-address"
                    maxLength={500}
                    value={values.shippingAddress}
                    onChange={(e) => setValue("shippingAddress", e.target.value)}
                    onBlur={() => onBlur("shippingAddress")}
                    aria-required="true"
                    aria-invalid={errors.shippingAddress ? true : undefined}
                    aria-describedby={describedBy(
                      FIELD_ID.shippingAddress,
                      "บ้านเลขที่ หมู่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์",
                      errors.shippingAddress,
                    )}
                    className={`${inputClass} ${errors.shippingAddress ? "input-error" : ""}`}
                  />
                </FormField>
              )}

              <FormField
                id={FIELD_ID.paymentSlip}
                label="ลิงก์หรือชื่อไฟล์สลิปโอนเงิน (ไม่บังคับ)"
                hint="ยังไม่ได้โอน เว้นว่างไว้ได้ แล้วแนบสลิปภายหลังในหน้ารายละเอียดคำสั่งซื้อ"
                error={errors.paymentSlip}
              >
                <input
                  id={FIELD_ID.paymentSlip}
                  type="text"
                  maxLength={255}
                  value={values.paymentSlip}
                  onChange={(e) => setValue("paymentSlip", e.target.value)}
                  onBlur={() => onBlur("paymentSlip")}
                  aria-invalid={errors.paymentSlip ? true : undefined}
                  aria-describedby={describedBy(
                    FIELD_ID.paymentSlip,
                    "ยังไม่ได้โอน เว้นว่างไว้ได้ แล้วแนบสลิปภายหลังในหน้ารายละเอียดคำสั่งซื้อ",
                    errors.paymentSlip,
                  )}
                  className={`${inputClass} ${errors.paymentSlip ? "input-error" : ""}`}
                />
              </FormField>
            </div>
          </section>
        </div>

        <section className={`${cardClass} self-start xl:sticky xl:top-24`} aria-labelledby="checkout-summary-title">
          <div className={cardHeaderClass}>
            <h2 id="checkout-summary-title" className={cardTitleClass}>
              สรุปยอด
            </h2>
          </div>
          <div className="space-y-4 p-6">
            <dl className="space-y-2 text-body-md">
              <div className="flex justify-between gap-3">
                <dt className="text-on-surface-variant">
                  ราคาสินค้า (<span className="tabular-nums">{formatNumber(count)}</span> ชิ้น)
                </dt>
                <dd className="text-on-surface tabular-nums">{formatMoney(subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-on-surface-variant">ค่าจัดส่ง</dt>
                <dd className="text-right text-on-surface tabular-nums">
                  {isDelivery ? formatMoney(SHIPPING_FEE_NOTICE) : "ไม่มี"}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-outline-variant/40 pt-2">
                <dt className="font-semibold text-on-surface">ยอดรวมโดยประมาณ</dt>
                <dd className="font-semibold text-primary-container tabular-nums">
                  {formatMoney(subtotal + (isDelivery ? SHIPPING_FEE_NOTICE : 0))}
                </dd>
              </div>
            </dl>
            <p className="text-body-md text-on-surface-variant">
              ยอดที่ต้องชำระจริงคำนวณโดยระบบเมื่อสั่งซื้อ และแสดงในหน้ารายละเอียดคำสั่งซื้อ
            </p>

            <p aria-live="polite" className={announce ? "text-label-sm text-error" : "sr-only"}>
              {announce}
            </p>

            {formError && (
              <Alert title={formError.title}>
                <p>{formError.message}</p>
                {formError.hint && <p className="mt-1">{formError.hint}</p>}
              </Alert>
            )}

            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <Link href="/" className={`${secondaryButtonClass} ${focusRing}`}>
                เลือกสินค้าเพิ่ม
              </Link>
              <button
                type="submit"
                className={`${primaryButtonClass} relative ${focusRing} ${submitting ? "btn-loading" : ""}`}
                aria-busy={submitting}
              >
                <span className="btn-text flex items-center gap-2">สั่งซื้อ</span>
                <span className="dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </button>
            </div>
          </div>
        </section>
      </form>

      {removeTarget && (
        <ConfirmDeleteModal
          title="ลบสินค้าออกจากตะกร้า"
          message={
            <>
              ลบ{" "}
              <strong className="text-on-surface">
                &quot;{removeTarget.productName} ({removeTarget.variantName})&quot;
              </strong>{" "}
              ออกจากตะกร้า? รายการนี้จะไม่ถูกรวมในคำสั่งซื้อ
            </>
          }
          onClose={() => setRemoveTarget(null)}
          onConfirm={() => {
            remove(removeTarget.variantId);
            setRemoveTarget(null);
          }}
        />
      )}
    </div>
  );
}
