"use client";

import { QRCodeSVG } from "qrcode.react";

/**
 * QR ของรหัสรับสินค้า — ใส่ได้เฉพาะรหัสรับสินค้า (ไม่มี token หรือข้อมูลบุคคล · tech-stack.md ข้อ 1.4.2)
 * สีมาจาก token ผ่าน currentColor
 */
export function QrCode({ value, size = 180 }: { value: string | null | undefined; size?: number }) {
  if (!value) {
    return (
      <div
        className="flex h-44 w-44 items-center justify-center rounded-lg bg-surface-container text-center text-body-md text-on-surface-variant"
      >
        ไม่มีรหัสรับสินค้า
      </div>
    );
  }
  return (
    <div className="inline-flex rounded-lg bg-white p-2 text-brand-navy">
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        marginSize={1}
        fgColor="currentColor"
        bgColor="transparent"
        role="img"
        aria-label={`QR รหัสรับสินค้า ${value}`}
      />
    </div>
  );
}
