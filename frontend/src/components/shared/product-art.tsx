"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * ภาพสินค้า — มีรูปที่เจ้าหน้าที่อัปโหลด (imageUrl) ก็แสดงรูปจริง
 * ไม่มีรูปหรือรูปโหลดไม่ขึ้น → วาดภาพลายเส้นตามหมวดหมู่แทน หน้าร้านจึงไม่มีช่องว่าง
 */
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

function kindOf(name = "", category = ""): keyof typeof SHAPES {
  const t = `${name} ${category}`.toLowerCase();
  if (t.includes('hood') || t.includes('ฮู้ด') || t.includes('แจ็ค') || t.includes('กันหนาว')) return 'hoodie';
  if (t.includes('polo') || t.includes('โปโล') || t.includes('เสื้อ')) return 'polo';
  if (t.includes('flask') || t.includes('แก้ว') || t.includes('ขวด') || t.includes('tumbler')) return 'flask';
  if (t.includes('tote') || t.includes('กระเป๋า') || t.includes('bag') || t.includes('ถุง')) return 'tote';
  if (t.includes('lanyard') || t.includes('สายคล้อง')) return 'lanyard';
  if (t.includes('สมุด') || t.includes('note') || t.includes('เครื่องเขียน')) return 'note';
  return 'generic';
}


export function ProductArt({
  name,
  category,
  src,
  className = "",
  sizes = "(min-width: 768px) 33vw, 100vw",
}: {
  name: string;
  category: string;
  src?: string | null;
  className?: string;
  sizes?: string;
}) {
  const [broken, setBroken] = useState(false);

  if (src && !broken) {
    return (
      <div className={`relative overflow-hidden bg-primary-container/10 ${className}`}>
        <Image
          src={src}
          alt={name || "รูปสินค้า"}
          fill
          sizes={sizes}
          unoptimized
          className="object-cover"
          onError={() => setBroken(true)}
        />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-primary-container/10 ${className}`}>
      <svg
        viewBox="0 0 160 150"
        className="relative h-full w-full text-primary-container"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        role="img"
        aria-label={name}
      >
        {SHAPES[kindOf(name, category)]}
      </svg>
    </div>
  );
}
