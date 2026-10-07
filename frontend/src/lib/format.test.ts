import { describe, expect, it } from "vitest";
import {
  bahtInputToSatang,
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatPhone,
  satangToBahtInput,
} from "./format";

describe("format (design-system.md ข้อ 11.3)", () => {
  it("เงินจาก API เป็นสตางค์ → บาท 2 ตำแหน่ง", () => {
    expect(formatMoney(15000)).toBe("150.00 บาท");
    expect(formatMoney(123456)).toBe("1,234.56 บาท");
    expect(formatMoney(null)).toBe("0.00 บาท");
  });

  it("วันที่เป็น พ.ศ. ตามเวลาไทย", () => {
    expect(formatDate("2026-08-11")).toBe("11 ส.ค. 2569");
    expect(formatDate("2026-08-11", "long")).toBe("11 สิงหาคม 2569");
    // 10 ส.ค. 20:00 UTC = 11 ส.ค. 03:00 เวลาไทย
    expect(formatDate("2026-08-10T20:00:00Z")).toBe("11 ส.ค. 2569");
    expect(formatDateTime("2026-08-11T02:30:00Z")).toBe("11 ส.ค. 2569 09:30 น.");
    expect(formatDate(null)).toBe("—");
  });

  it("ตัวเลขและเบอร์โทร", () => {
    expect(formatNumber(2450)).toBe("2,450");
    expect(formatPhone("0812345678")).toBe("081-234-5678");
    expect(formatPhone("021234567")).toBe("02-123-4567");
  });

  it("แปลงราคาที่พิมพ์เป็นบาท ↔ สตางค์ โดยไม่มีปัญหาทศนิยม", () => {
    expect(bahtInputToSatang("150")).toBe(15000);
    expect(bahtInputToSatang("150.5")).toBe(15050);
    expect(bahtInputToSatang("0.29")).toBe(29);
    expect(bahtInputToSatang("1.999")).toBeNull();
    expect(bahtInputToSatang("-1")).toBeNull();
    expect(bahtInputToSatang("abc")).toBeNull();
    expect(satangToBahtInput(15050)).toBe("150.50");
  });
});
