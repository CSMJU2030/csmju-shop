"use client";

import { useState, type FormEvent } from "react";
import { Modal, inputClass, primaryButtonClass, secondaryButtonClass } from "@/csmju";
import { ApiError, api } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import type { VariantWithProduct } from "@/lib/types";
import { errorMessage } from "@/components/shared/api-error-view";
import { FormField, describedBy } from "@/components/shared/form-field";
import { Alert } from "@/components/shared/states";
import { LoadingButton, focusRing } from "./products-ui";

type Mode = "add" | "remove" | "set";

const MODES: { value: Mode; label: string }[] = [
  { value: "add", label: "รับของเข้า (เพิ่ม)" },
  { value: "remove", label: "ตัดออก (ลด)" },
  { value: "set", label: "กำหนดจำนวนคงเหลือ" },
];

/** ปรับสต็อกแบบระบุจำนวน: เพิ่ม/ลด (adjust) หรือกำหนดค่าใหม่ (set) */
export function StockAdjustModal({
  variant,
  onClose,
  onSaved,
}: {
  variant: VariantWithProduct;
  onClose: () => void;
  onSaved: (variant: VariantWithProduct) => void;
}) {
  const [mode, setMode] = useState<Mode>("add");
  const [amount, setAmount] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const current = variant.stockQuantity;
  const parsed = /^\d+$/.test(amount.trim()) ? Number(amount.trim()) : null;
  const next = parsed === null ? null : mode === "add" ? current + parsed : mode === "remove" ? current - parsed : parsed;

  const validate = (): string | null => {
    if (parsed === null) return "กรอกจำนวนเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป";
    if (mode !== "set" && parsed === 0) return "จำนวนที่ปรับต้องมากกว่า 0";
    if (next !== null && next < 0) return `ลดได้ไม่เกินจำนวนคงเหลือ (${formatNumber(Math.max(current, 0))} ชิ้น)`;
    return null;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setFormError(null);
    const problem = validate();
    setFieldError(problem);
    if (problem || parsed === null) {
      document.getElementById("stock-amount")?.focus();
      return;
    }
    setSaving(true);
    try {
      const result =
        mode === "set"
          ? await api.setStock(variant.id, parsed)
          : await api.adjustStock(variant.id, mode === "add" ? parsed : -parsed);
      onSaved(result);
    } catch (error) {
      if (error instanceof ApiError && error.code === "UNAUTHORIZED") return;
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const label = `${variant.product.name} · ${variant.variantName}`;

  return (
    <Modal title="ปรับสต็อก" onClose={onClose}>
      <form noValidate onSubmit={submit} className="space-y-4">
        <div>
          <p className="text-body-md text-on-surface">{label}</p>
          <p className="text-body-md text-on-surface-variant tabular-nums">
            คงเหลือตอนนี้ {formatNumber(current)} ชิ้น
            {current < 0 && ` (ค้างผลิต ${formatNumber(-current)} ชิ้น)`}
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-label-md text-on-surface">วิธีปรับ</legend>
          {MODES.map((m) => (
            <label key={m.value} className="flex items-center gap-3 text-body-md text-on-surface">
              <input
                type="radio"
                name="stock-mode"
                value={m.value}
                checked={mode === m.value}
                onChange={() => {
                  setMode(m.value);
                  setFieldError(null);
                }}
                className="h-4 w-4 shrink-0 accent-primary"
              />
              {m.label}
            </label>
          ))}
        </fieldset>

        <FormField
          id="stock-amount"
          label={mode === "set" ? "จำนวนคงเหลือใหม่ (ชิ้น)" : "จำนวน (ชิ้น)"}
          required
          hint={next !== null && !fieldError ? `หลังบันทึกจะเหลือ ${formatNumber(next)} ชิ้น` : undefined}
          error={fieldError}
        >
          <input
            id="stock-amount"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => amount && setFieldError(validate())}
            aria-required="true"
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={describedBy("stock-amount", next !== null ? "hint" : undefined, fieldError)}
            className={`${inputClass} tabular-nums ${fieldError ? "input-error" : ""}`}
          />
        </FormField>

        {formError && <Alert title="ปรับสต็อกไม่สำเร็จ">{formError}</Alert>}

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
