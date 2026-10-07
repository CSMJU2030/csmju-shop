/**
 * รายชื่อบริษัทขนส่งและลิงก์หน้าเช็คพัสดุ
 *
 * ฐานข้อมูลเก็บแค่ `shipping_carrier` (shippingCarrier) เป็นรหัสสั้น ๆ (เช่น "flash") ไม่ได้เก็บทั้งลิงก์
 * เพราะถ้าวันหนึ่งขนส่งเปลี่ยน URL จะได้แก้ที่ไฟล์นี้ไฟล์เดียว ไม่ต้องไล่แก้ข้อมูลเก่าในตาราง
 *
 * `track` คือแม่แบบลิงก์ — {code} จะถูกแทนด้วยเลขพัสดุ
 * ขนส่งที่หน้าเว็บไม่รับเลขพัสดุทาง URL จะใส่ `track` เป็นหน้าเช็คพัสดุเฉย ๆ แล้วตั้ง paste: true
 * หน้าเว็บจะบอกลูกค้าให้กด "คัดลอกเลข" ไปวางเองแทน
 */
export interface Carrier {
  code: string;
  label: string;
  track: string | null;
  paste?: boolean;
}

export const CARRIERS: Carrier[] = [
  {
    code: 'thailand_post',
    label: 'ไปรษณีย์ไทย',
    track: 'https://track.thailandpost.co.th/?trackNumber={code}',
  },
  {
    code: 'flash',
    label: 'Flash Express',
    track: 'https://www.flashexpress.co.th/fle/tracking?se={code}',
  },
  {
    code: 'kerry',
    label: 'Kerry Express',
    track: 'https://th.kerryexpress.com/th/track/?track={code}',
  },
  {
    code: 'jt',
    label: 'J&T Express',
    track: 'https://www.jtexpress.co.th/service/track',
    paste: true,
  },
  {
    code: 'ninjavan',
    label: 'Ninja Van',
    track: 'https://www.ninjavan.co/th-th/tracking?id={code}',
  },
  {
    code: 'best',
    label: 'BEST Express',
    track: 'https://www.best-inc.co.th/track?bills={code}',
  },
  {
    code: 'scg',
    label: 'SCG Express',
    track: 'https://www.scgexpress.co.th/tracking',
    paste: true,
  },
  {
    code: 'dhl',
    label: 'DHL',
    track: 'https://www.dhl.com/th-th/home/tracking.html?tracking-id={code}',
  },
];

/** หา object ของขนส่งจากรหัส — ถ้าไม่รู้จัก (เจ้าหน้าที่พิมพ์ชื่อเอง) คืนชื่อที่พิมพ์มาโดยไม่มีลิงก์ */
export function carrierOf(code: string | null | undefined): Carrier | null {
  if (!code) return null;
  return CARRIERS.find((c) => c.code === code) ?? { code, label: code, track: null };
}

/** ชื่อขนส่งที่เอาไปแสดงได้เลย */
export function carrierLabel(code: string | null | undefined): string {
  return carrierOf(code)?.label ?? '—';
}

/** ลิงก์หน้าเช็คพัสดุ — คืน null ถ้าไม่รู้จักขนส่งนั้นหรือยังไม่มีเลขพัสดุ */
export function trackingUrl(code: string | null | undefined, tracking: string | null | undefined): string | null {
  const carrier = carrierOf(code);
  if (!carrier?.track || !tracking) return null;
  return carrier.track.replace('{code}', encodeURIComponent(tracking.trim()));
}
