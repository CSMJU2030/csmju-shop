import { describe, expect, it } from "vitest";
import { carrierLabel, trackingUrl } from "./carriers";
import { can, isStaff, PERMISSION } from "./permissions";

describe("carriers", () => {
  it("สร้างลิงก์เช็คพัสดุจากรหัสขนส่ง", () => {
    expect(trackingUrl("flash", " TH123 ")).toBe("https://www.flashexpress.co.th/fle/tracking?se=TH123");
    expect(trackingUrl("unknown", "X1")).toBeNull();
    expect(trackingUrl("flash", "")).toBeNull();
    expect(carrierLabel("thailand_post")).toBe("ไปรษณีย์ไทย");
    expect(carrierLabel("ขนส่งเอกชน")).toBe("ขนส่งเอกชน");
    expect(carrierLabel(null)).toBe("—");
  });
});

describe("permissions (ใช้ซ่อนปุ่มเท่านั้น backend บังคับสิทธิ์จริง)", () => {
  it("ตรวจ permission จาก /api/v1/me", () => {
    expect(can(["product:read"], PERMISSION.PRODUCT_CREATE)).toBe(false);
    expect(can(["product:create"], PERMISSION.PRODUCT_CREATE)).toBe(true);
    expect(isStaff(["order:read:own"])).toBe(false);
    expect(isStaff(["order:read:any"])).toBe(true);
    expect(isStaff(undefined)).toBe(false);
  });
});
