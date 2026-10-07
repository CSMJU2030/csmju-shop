/**
 * รูปแบบการแสดงผล (design-system.md ข้อ 11.3) — วันที่เป็น พ.ศ. · timezone Asia/Bangkok เสมอ
 * เงินจาก API เป็นจำนวนเต็มหน่วยสตางค์ → หาร 100 ก่อนแสดง
 * (util ชั่วคราวจนกว่า @csmju2030/design-system จะมี formatDate/formatMoney ให้)
 */
const TZ = "Asia/Bangkok";

const dateFmt = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
const longDateFmt = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("th-TH", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const moneyFmt = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numberFmt = new Intl.NumberFormat("th-TH");

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  // วันที่ล้วน YYYY-MM-DD ให้ถือเป็นวันนั้นตามเวลาไทย
  const d = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00+07:00`) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 11 ส.ค. 2569 */
export function formatDate(value: string | Date | null | undefined, style: "short" | "long" = "short"): string {
  const d = toDate(value);
  if (!d) return "—";
  return (style === "long" ? longDateFmt : dateFmt).format(d);
}

/** 09:30 น. */
export function formatTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? `${timeFmt.format(d)} น.` : "—";
}

/** 11 ส.ค. 2569 09:30 น. */
export function formatDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? `${dateFmt.format(d)} ${timeFmt.format(d)} น.` : "—";
}

/** 15000 (สตางค์) → "150.00 บาท" */
export function formatMoney(satang: number | null | undefined): string {
  return `${moneyFmt.format((satang ?? 0) / 100)} บาท`;
}

/** 2450 → "2,450" */
export function formatNumber(value: number | null | undefined): string {
  return numberFmt.format(value ?? 0);
}

/** "0812345678" → "081-234-5678" */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  return value;
}

/** "150.50" (บาทที่ผู้ใช้พิมพ์) → 15050 (สตางค์) · ค่าไม่ถูกต้องคืน null */
export function bahtInputToSatang(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** 15050 → "150.50" สำหรับใส่กลับในช่องกรอกราคา */
export function satangToBahtInput(satang: number): string {
  return (satang / 100).toFixed(2);
}
