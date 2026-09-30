'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

/** วาด QR จากข้อความจริง (ใช้ pickup_code ที่ backend สร้างให้) */
export default function QrCode({ value, size = 180, dark = '#141d4d', light = '#ffffff' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    QRCode.toCanvas(ref.current, value, {
      width: size,
      margin: 1,
      color: { dark, light },
      errorCorrectionLevel: 'M',
    }).catch(() => {
      /* ค่าที่ยาวเกินไปวาดไม่ได้ — ปล่อยว่างไว้ */
    });
  }, [value, size, dark, light]);

  if (!value) {
    return (
      <div
        className="grid place-items-center rounded-lg bg-slate-100 text-xs text-slate-400"
        style={{ width: size, height: size }}
      >
        ไม่มีรหัสรับสินค้า
      </div>
    );
  }

  return <canvas ref={ref} className="rounded-lg" aria-label={`QR code ${value}`} />;
}
