/**
 * ตัวกลางคุยกับ NestJS API
 * ทุก response จาก backend อยู่ในรูป { success, message, data, meta? }
 * ฟังก์ชันที่นี่คลี่ `data` ออกมาให้ และโยน Error พร้อมข้อความภาษาไทยจาก API เมื่อไม่สำเร็จ
 *
 * เส้นทาง /api/* ถูก Next.js ส่งต่อไป NestJS ผ่าน rewrites ใน next.config.mjs
 */

const BASE = '/api';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('ต่อกับเซิร์ฟเวอร์ไม่ได้ — ตรวจว่ารัน npm run dev ฝั่ง backend อยู่หรือเปล่า', 0);
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    /* บาง response ไม่มี body */
  }

  if (!res.ok) {
    throw new ApiError(payload?.message || `คำขอล้มเหลว (${res.status})`, res.status, payload?.details);
  }
  return payload;
}

/**
 * อัปโหลดไฟล์ — ต้องส่งเป็น multipart/form-data
 * ห้ามตั้ง Content-Type เอง ต้องปล่อยให้เบราว์เซอร์ใส่ boundary ให้
 */
async function upload(path, file) {
  const form = new FormData();
  form.append('file', file);

  let res;
  try {
    res = await fetch(BASE + path, { method: 'POST', body: form });
  } catch {
    throw new ApiError('ต่อกับเซิร์ฟเวอร์ไม่ได้ — ตรวจว่ารัน npm run dev ฝั่ง backend อยู่หรือเปล่า', 0);
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    /* ไม่มี body */
  }
  if (!res.ok) throw new ApiError(payload?.message || `อัปโหลดไม่สำเร็จ (${res.status})`, res.status);
  return payload;
}

const get = (p) => request(p);
const post = (p, body) => request(p, { method: 'POST', body });
const put = (p, body) => request(p, { method: 'PUT', body });
const patch = (p, body) => request(p, { method: 'PATCH', body });
const del = (p) => request(p, { method: 'DELETE' });

export const api = {
  health: () => get('/health'),

  // ── สินค้า ──
  listProducts: (params = {}) => get(`/products?${new URLSearchParams({ limit: '100', ...params })}`),
  getProduct: (id) => get(`/products/${id}`),
  createProduct: (payload) => post('/products', payload),
  updateProduct: (id, payload) => put(`/products/${id}`, payload),
  deleteProduct: (id) => del(`/products/${id}`),
  listCategories: () => get('/products/categories/all'),

  // ── ตัวเลือกสินค้า (ไซส์/สี) + สต็อก ──
  listVariants: (params = {}) => get(`/variants?${new URLSearchParams({ limit: '100', ...params })}`),
  createVariant: (payload) => post('/variants', payload),
  updateVariant: (id, payload) => put(`/variants/${id}`, payload),
  /** กำหนดสต็อกเป็นค่าที่ระบุ (backend รับฟิลด์ชื่อ set) */
  setStock: (id, qty) => patch(`/variants/${id}/stock`, { set: qty }),
  /** บวก/ลบสต็อกจากค่าปัจจุบัน เช่น +10 เมื่อของเข้าเพิ่ม */
  adjustStock: (id, delta) => patch(`/variants/${id}/stock`, { adjust: delta }),
  deleteVariant: (id) => del(`/variants/${id}`),

  // ── รูปสินค้า ──
  /** อัปโหลดไฟล์รูป แล้วได้ URL กลับมาใส่ใน image_url ของสินค้า */
  uploadImage: (file) => upload('/uploads/image', file),
  deleteImage: (url) => del(`/uploads/image?url=${encodeURIComponent(url)}`),

  // ── ผู้ใช้ ──
  listUsers: (params = {}) => get(`/users?${new URLSearchParams({ limit: '100', ...params })}`),

  // ── คำสั่งซื้อ ──
  listOrders: (params = {}) => get(`/orders?${new URLSearchParams({ limit: '100', ...params })}`),
  getOrder: (id) => get(`/orders/${id}`),
  createOrder: (payload) => post('/orders', payload),
  attachSlip: (id, payment_slip) => patch(`/orders/${id}/payment-slip`, { payment_slip }),
  setPaymentStatus: (id, payment_status) => patch(`/orders/${id}/payment-status`, { payment_status }),
  setOrderStatus: (id, order_status) => patch(`/orders/${id}/order-status`, { order_status }),
  /**
   * บันทึกบริษัทขนส่ง + เลขพัสดุ (เฉพาะออร์เดอร์แบบจัดส่ง)
   * ส่งค่าว่างทั้งคู่ = ล้างข้อมูลจัดส่งทิ้ง
   */
  setShipping: (id, payload) => patch(`/orders/${id}/shipping`, payload),
  orderSummary: () => get('/orders/stats/summary'),
  /**
   * ลบคำสั่งซื้อ
   * backend จะคืนสต็อกให้เฉพาะคำสั่งซื้อที่ยังไม่ส่งมอบ
   * ถ้า order_status = completed จะลบทิ้งโดยไม่คืนสต็อก (ของออกจากร้านไปแล้ว)
   */
  deleteOrder: (id) => del(`/orders/${id}`),

  // ── การรับสินค้า ──
  verifyPickup: (pickup_code) => post('/pickup-logs/verify', { pickup_code }),
  createPickupLog: (payload) => post('/pickup-logs', payload),
  listPickupLogs: () => get('/pickup-logs?limit=100'),
};
