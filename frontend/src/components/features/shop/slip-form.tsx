"use client";

import { useState, type FormEvent } from "react";
import { primaryButtonClass } from "@/csmju";
import { errorMessage } from "@/components/shared/api-error-view";
import { FormField, describedBy } from "@/components/shared/form-field";
import { OpenInNewIcon } from "@/components/shared/shop-icons";
import { Alert } from "@/components/shared/states";
import { useToast } from "@/components/shared/toast";
import { ApiError, api } from "@/lib/api";
import type { Order } from "@/lib/types";
import { focusRing, linkClass } from "./shop-ui";
import { SlipUpload } from "./slip-upload";

const FIELD_ID = "order-payment-slip";
const HINT = "รองรับไฟล์ภาพ JPG, PNG, WebP ขนาดไม่เกิน 5 MB";

function validate(value: string): string | null {
  const v = value.trim();
  if (!v) return "กรุณาอัปโหลดสลิปโอนเงิน";
  if (v.length > 255) return "ข้อมูลสลิปไม่ถูกต้อง กรุณาอัปโหลดใหม่";
  return null;
}

/** สลิปปัจจุบัน — แสดงเป็นลิงก์เฉพาะเมื่อเป็น http(s) */
export function CurrentSlip({ slip }: { slip: string | null }) {
  if (!slip) return <p className="text-body-md text-on-surface-variant">ยังไม่ได้แนบสลิป</p>;
  if (/^https?:\/\//i.test(slip) || /^\/api\//.test(slip)) {
    return (
      <a href={slip} target="_blank" rel="noopener noreferrer" className={`${linkClass} break-words`}>
        <OpenInNewIcon className="h-4 w-4 shrink-0" />
        เปิดดูสลิปที่แนบไว้
        <span className="sr-only"> (เปิดในแท็บใหม่)</span>
      </a>
    );
  }
  return <p className="text-body-md break-words text-on-surface">{slip}</p>;
}

/** แนบสลิปการชำระเงิน — ใช้ได้เมื่อสถานะการชำระเงินเป็น PENDING หรือ REJECTED */
export function SlipForm({ order, onAttached }: { order: Order; onAttached: (order: Order) => void }) {
  const toast = useToast();
  const [value, setValue] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;
    setFormError(null);
    const message = validate(value);
    setFieldError(message);
    if (message) {
      document.getElementById(FIELD_ID)?.focus();
      return;
    }
    setSaving(true);
    try {
      const updated = await api.attachSlip(order.id, value.trim());
      setValue("");
      onAttached(updated);
      toast("แนบสลิปแล้ว รอเจ้าหน้าที่ตรวจสอบ");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "UNAUTHORIZED") return;
        if (error.code === "VALIDATION_ERROR") {
          setFieldError(error.message);
          document.getElementById(FIELD_ID)?.focus();
          return;
        }
        if (error.code === "CONFLICT") {
          setFormError(`${error.message} กรุณาโหลดสถานะล่าสุดแล้วตรวจสอบอีกครั้ง`);
          return;
        }
      }
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      {order.paymentStatus === "REJECTED" && (
        <Alert tone="warning">สลิปก่อนหน้าไม่ผ่านการตรวจสอบ กรุณาแนบสลิปใหม่</Alert>
      )}
      <FormField id={FIELD_ID} label="อัปโหลดสลิปโอนเงิน" required hint={HINT} error={fieldError}>
        <SlipUpload
          id={FIELD_ID}
          value={value}
          onChange={(url) => {
            setValue(url);
            setFieldError(null);
          }}
          invalid={!!fieldError}
          describedBy={describedBy(FIELD_ID, HINT, fieldError)}
        />
      </FormField>
      {formError && <Alert title="แนบสลิปไม่สำเร็จ">{formError}</Alert>}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          className={`${primaryButtonClass} relative ${focusRing} ${saving ? "btn-loading" : ""}`}
          aria-busy={saving}
        >
          <span className="btn-text flex items-center gap-2">แนบสลิป</span>
          <span className="dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>
    </form>
  );
}
