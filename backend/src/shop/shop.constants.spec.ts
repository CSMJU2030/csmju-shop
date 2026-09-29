import {
  formatOrderNumber,
  generatePickupCode,
  orderNumberPrefix,
  orderNumberSequence,
  toDateOnly,
} from './shop.constants';

describe('shop helpers', () => {
  it('เลขที่คำสั่งซื้อใช้ปี-เดือนตามเวลาไทย', () => {
    // 30 ก.ย. 2026 20:00 UTC = 1 ต.ค. 2026 03:00 เวลาไทย
    expect(orderNumberPrefix(new Date('2026-09-30T20:00:00Z'))).toBe('ORD-202610-');
    expect(formatOrderNumber(7, 'ORD-202610-')).toBe('ORD-202610-0007');
  });

  it('อ่านลำดับท้ายเลขที่คำสั่งซื้อ', () => {
    expect(orderNumberSequence('ORD-202609-0012', 'ORD-202609-')).toBe(12);
    expect(orderNumberSequence('ORD-202608-0012', 'ORD-202609-')).toBe(0);
  });

  it('รหัสรับสินค้า PICKUP- ตามด้วยเลข 6 หลัก', () => {
    expect(generatePickupCode(() => 0)).toBe('PICKUP-100000');
    expect(generatePickupCode()).toMatch(/^PICKUP-\d{6}$/);
  });

  it('วันที่แบบ YYYY-MM-DD', () => {
    expect(toDateOnly(new Date('2027-01-20T00:00:00Z'))).toBe('2027-01-20');
    expect(toDateOnly(null)).toBeNull();
  });
});
