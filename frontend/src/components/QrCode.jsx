'use client';

import { useEffect, useRef } from 'react';

/** อ่านสีจาก design token ของ CSMJU (ห้ามพิมพ์ hex ในโค้ด) */
function tokenColor(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/**
 * วาด QR จากข้อความจริง (ใช้ pickup_code ที่ backend สร้างให้)
 * ใช้ตัวสร้าง QR ที่เก็บไว้ในโปรเจกต์ (lib/vendor/qrcode-generator.js)
 * โหลดตอนต้องวาดเท่านั้น จึงไม่ติดไปกับ bundle แรกของหน้า
 */
export default function QrCode({ value, size = 180 }) {
  const ref = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = ref.current;
    if (!canvas || !value) return;

    (async () => {
      const mod = await import('@/lib/vendor/qrcode-generator.js');
      const qrcode = mod.default ?? mod;
      if (cancelled) return;

      let qr;
      try {
        qr = qrcode(0, 'M'); // 0 = เลือกขนาดให้อัตโนมัติ
        qr.addData(value);
        qr.make();
      } catch {
        return; // ค่าที่ยาวเกินไปวาดไม่ได้ — ปล่อยว่างไว้
      }

      const modules = qr.getModuleCount();
      const quiet = 1; // ขอบว่างรอบ QR (หน่วยเป็นช่อง)
      const cell = Math.max(1, Math.floor(size / (modules + quiet * 2)));
      const px = cell * (modules + quiet * 2);
      const dpr = window.devicePixelRatio || 1;

      canvas.width = px * dpr;
      canvas.height = px * dpr;
      canvas.style.width = `${px}px`;
      canvas.style.height = `${px}px`;

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.fillStyle = tokenColor('--csmju-color-surface', 'white');
      ctx.fillRect(0, 0, px, px);
      ctx.fillStyle = tokenColor('--csmju-color-text', 'black');
      for (let r = 0; r < modules; r++) {
        for (let c = 0; c < modules; c++) {
          if (qr.isDark(r, c)) ctx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [value, size]);

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

  return <canvas ref={ref} className="rounded-lg" role="img" aria-label={`QR code ${value}`} />;
}
