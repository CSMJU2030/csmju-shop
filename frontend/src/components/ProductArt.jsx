'use client';

import { useState } from 'react';

/**
 * ภาพสินค้า
 *
 * - มี `src` (คือ image_url ที่เจ้าหน้าที่อัปโหลด) → แสดงรูปจริง
 * - ไม่มีรูป หรือรูปโหลดไม่ขึ้น → วาดภาพ SVG ตามหมวดหมู่ให้แทน
 *   หน้าร้านจึงไม่มีช่องว่างโบ๋ ๆ ให้เห็นไม่ว่ากรณีไหน
 */

function kindOf(name = '', category = '') {
  const t = `${name} ${category}`.toLowerCase();
  if (t.includes('hood') || t.includes('ฮู้ด') || t.includes('แจ็ค') || t.includes('กันหนาว')) return 'hoodie';
  if (t.includes('polo') || t.includes('โปโล') || t.includes('เสื้อ')) return 'polo';
  if (t.includes('flask') || t.includes('แก้ว') || t.includes('ขวด') || t.includes('tumbler')) return 'flask';
  if (t.includes('tote') || t.includes('กระเป๋า') || t.includes('bag') || t.includes('ถุง')) return 'tote';
  if (t.includes('lanyard') || t.includes('สายคล้อง')) return 'lanyard';
  if (t.includes('สมุด') || t.includes('note') || t.includes('เครื่องเขียน')) return 'note';
  return 'generic';
}

const SHAPES = {
  polo: (
    <>
      <path d="M52 40h16l12-8 12 8h16l10 16-14 10v46a4 4 0 0 1-4 4H60a4 4 0 0 1-4-4V66l-14-10 10-16Z" />
      <path d="M68 40l12 12 12-12" />
      <path d="M80 52v22" />
    </>
  ),
  hoodie: (
    <>
      <path d="M52 48h14l14-12 14 12h14l14 18-16 10v40a4 4 0 0 1-4 4H58a4 4 0 0 1-4-4V76L38 66l14-18Z" />
      <path d="M66 36c0 8 6 14 14 14s14-6 14-14" />
      <path d="M72 62v6a8 8 0 0 0 16 0v-6" />
      <path d="M72 68 68 96M88 68l4 28" />
    </>
  ),
  flask: (
    <>
      <rect x="62" y="30" width="36" height="14" rx="4" />
      <path d="M66 44h28v66a10 10 0 0 1-10 10h-8a10 10 0 0 1-10-10V44Z" />
      <path d="M66 62h28" />
    </>
  ),
  tote: (
    <>
      <path d="M46 54h68l6 66H40l6-66Z" />
      <path d="M66 54V42a14 14 0 0 1 28 0v12" />
      <path d="M62 78h36v24H62z" />
    </>
  ),
  lanyard: (
    <>
      <path d="M62 30 80 76l18-46" />
      <rect x="66" y="76" width="28" height="42" rx="5" />
      <path d="M74 88h12" />
    </>
  ),
  note: (
    <>
      <rect x="48" y="34" width="64" height="84" rx="6" />
      <path d="M62 34v84" />
      <path d="M76 58h24M76 74h24M76 90h16" />
    </>
  ),
  generic: (
    <>
      <path d="M80 30 122 52v44L80 118 38 96V52L80 30Z" />
      <path d="M38 52l42 22 42-22M80 74v44" />
    </>
  ),
};

export default function ProductArt({ name, category, src, className = '' }) {
  const kind = kindOf(name, category);
  const [broken, setBroken] = useState(false);

  if (src && !broken) {
    return (
      <div className={`relative overflow-hidden bg-navy-50 ${className}`}>
        {/* ใช้ <img> ธรรมดา ไม่ใช่ next/image เพราะรูปมาจาก backend ของเราเองผ่าน rewrite */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name || 'รูปสินค้า'}
          className="size-full object-cover"
          onError={() => setBroken(true)}
        />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-navy-50 ${className}`}>
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(120% 80% at 30% 0%, var(--color-navy-100) 0%, transparent 60%)',
        }}
      />
      <svg
        viewBox="0 0 160 150"
        className="relative size-full text-navy-700"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        role="img"
        aria-label={name}
      >
        {SHAPES[kind]}
      </svg>
    </div>
  );
}
