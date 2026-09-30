import { Prisma } from '@prisma/client';

/**
 * แปลง Prisma Decimal / BigInt ให้เป็น number และ Date เป็น ISO string
 * เพื่อให้ JSON ที่ส่งออกอ่านง่ายและเทียบค่าได้ตรง ๆ ใน Postman test
 */
export function serialize(value: any): any {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return Number(value);
  if (Prisma.Decimal.isDecimal(value)) return Number(value);
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = serialize(v);
    return out;
  }
  return value;
}
