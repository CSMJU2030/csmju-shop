"use client";

import { useRef, useState } from "react";
import { errorMessage } from "@/components/shared/api-error-view";
import { ApiError, api } from "@/lib/api";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 5 * 1024 * 1024;

/** เลือกไฟล์สลิป (JPG/PNG/WebP ≤ 5MB) แล้วอัปโหลดทันที — ส่ง url กลับผ่าน onChange */
export function SlipUpload({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (url: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!ACCEPT.split(",").includes(file.type)) {
      setError("รองรับเฉพาะไฟล์ภาพ JPG, PNG หรือ WebP");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("ไฟล์ต้องมีขนาดไม่เกิน 5 MB");
      return;
    }
    setUploading(true);
    try {
      const slip = await api.uploadSlip(file);
      setFileName(file.name);
      onChange(slip.url);
    } catch (e) {
      if (e instanceof ApiError && e.code === "UNAUTHORIZED") return;
      setError(errorMessage(e));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ACCEPT}
        disabled={uploading}
        onChange={(e) => void pick(e.target.files?.[0])}
        onBlur={onBlur}
        aria-required="true"
        aria-invalid={invalid || error ? true : undefined}
        aria-describedby={describedBy}
        className="block w-full text-body-md text-on-surface file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-on-primary"
      />
      {uploading && <p className="text-body-md text-on-surface-variant" role="status">กำลังอัปโหลดสลิป…</p>}
      {value && !uploading && (
        <p className="text-body-md text-on-surface" role="status">
          อัปโหลดสลิปแล้ว{fileName ? `: ${fileName}` : ""} (เลือกไฟล์ใหม่เพื่อเปลี่ยน)
        </p>
      )}
      {error && (
        <p className="text-body-md text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
