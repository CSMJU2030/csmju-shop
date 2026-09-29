/**
 * ตัวกลางเรียก API ของ backend (ฝั่งเบราว์เซอร์)
 *
 * - เรียกผ่าน /api/v1/* ของ origin เดียวกัน (Next.js rewrite ไป backend) คุกกี้ session ติดไปเอง
 * - แกะ envelope { success, data, meta } ให้ · error คืนเป็น ApiError ที่มี code มาตรฐาน
 * - 401 = session หมดหรือยังไม่เข้าสู่ระบบ → พาไป SSO ของ Core Hub (ไม่แสดงอะไรให้ผู้ใช้ ตาม design-system.md ข้อ 9.3)
 */
import { SSO_LOGIN_URL } from "./auth-links";
import type {
  CreateOrderBody,
  CreatePickupLogBody,
  CreateProductBody,
  CreateVariantBody,
  Deleted,
  Me,
  Order,
  OrderItem,
  OrderStats,
  OrderStatus,
  PageMeta,
  PaymentStatus,
  PickupLog,
  PickupVerification,
  Product,
  ProductCategory,
  ProductImage,
  UpdateProductBody,
  UpdateShippingBody,
  UpdateVariantBody,
  VariantWithProduct,
} from "./types";

export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR";

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: number,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

type Query = Record<string, string | number | boolean | undefined | null>;

function qs(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

let redirecting = false;

/** session หมดอายุ → ต่ออายุด้วยการวิ่ง SSO ใหม่ (top-level navigation ไม่ใช่ fetch) */
function goToSso() {
  if (typeof window === "undefined" || redirecting) return;
  redirecting = true;
  window.location.assign(SSO_LOGIN_URL);
}

async function send<T>(path: string, init: RequestInit = {}): Promise<{ data: T; meta?: PageMeta }> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError("NETWORK_ERROR", "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง", 0);
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  const envelope = body as
    | { success: true; data: T; meta?: PageMeta }
    | { success: false; error: { code: ErrorCode; message: string; details?: string[] } }
    | null;

  if (res.ok && envelope && envelope.success) {
    return { data: envelope.data, meta: envelope.meta };
  }

  const error = envelope && !envelope.success ? envelope.error : undefined;
  const code: ErrorCode = error?.code ?? (res.status >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST");
  if (code === "UNAUTHORIZED") goToSso();
  throw new ApiError(code, error?.message ?? "ระบบขัดข้องชั่วคราว กรุณาลองอีกครั้ง", res.status, error?.details ?? []);
}

async function get<T>(path: string, query?: Query): Promise<T> {
  return (await send<T>(`${path}${qs(query)}`)).data;
}

async function list<T>(path: string, query?: Query): Promise<Page<T>> {
  const { data, meta } = await send<T[]>(`${path}${qs(query)}`);
  return { items: data, meta: meta ?? { total: data.length, page: 1, limit: data.length, totalPages: 1 } };
}

async function write<T>(method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  return (await send<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) })).data;
}

export const api = {
  me: () => get<Me>("/me"),

  // ── สินค้า ──
  listProducts: (query?: { page?: number; limit?: number; category?: string; isPreorder?: boolean; search?: string }) =>
    list<Product>("/products", query),
  getProduct: (id: string) => get<Product>(`/products/${id}`),
  createProduct: (body: CreateProductBody) => write<Product>("POST", "/products", body),
  updateProduct: (id: string, body: UpdateProductBody) => write<Product>("PATCH", `/products/${id}`, body),
  deleteProduct: (id: string) => write<Deleted>("DELETE", `/products/${id}`),
  listCategories: () => list<ProductCategory>("/product-categories", { limit: 100 }),

  // ── ตัวเลือกสินค้า + สต็อก ──
  listVariants: (query?: { page?: number; limit?: number; productId?: string; inStock?: boolean }) =>
    list<VariantWithProduct>("/product-variants", query),
  createVariant: (body: CreateVariantBody) => write<VariantWithProduct>("POST", "/product-variants", body),
  updateVariant: (id: string, body: UpdateVariantBody) => write<VariantWithProduct>("PATCH", `/product-variants/${id}`, body),
  deleteVariant: (id: string) => write<Deleted>("DELETE", `/product-variants/${id}`),
  setStock: (id: string, value: number) => write<VariantWithProduct>("PATCH", `/product-variants/${id}/stock`, { set: value }),
  adjustStock: (id: string, delta: number) => write<VariantWithProduct>("PATCH", `/product-variants/${id}/stock`, { adjust: delta }),

  // ── รูปสินค้า ──
  uploadImage: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return (await send<ProductImage>("/product-images", { method: "POST", body: form })).data;
  },
  deleteImage: (id: string) => write<Deleted>("DELETE", `/product-images/${id}`),

  // ── คำสั่งซื้อ ──
  listOrders: (query?: {
    page?: number;
    limit?: number;
    orderStatus?: OrderStatus;
    paymentStatus?: PaymentStatus;
    deliveryMethod?: "PICKUP" | "DELIVERY";
    search?: string;
    mine?: boolean;
  }) => list<Order>("/orders", query),
  getOrder: (id: string) => get<Order>(`/orders/${id}`),
  createOrder: (body: CreateOrderBody) => write<Order>("POST", "/orders", body),
  attachSlip: (id: string, paymentSlip: string) => write<Order>("PATCH", `/orders/${id}/payment-slip`, { paymentSlip }),
  setPaymentStatus: (id: string, paymentStatus: PaymentStatus) =>
    write<Order>("PATCH", `/orders/${id}/payment-status`, { paymentStatus }),
  setOrderStatus: (id: string, orderStatus: OrderStatus) =>
    write<Order>("PATCH", `/orders/${id}/order-status`, { orderStatus }),
  setShipping: (id: string, body: UpdateShippingBody) => write<Order>("PATCH", `/orders/${id}/shipping`, body),
  deleteOrder: (id: string) => write<Deleted>("DELETE", `/orders/${id}`),
  listOrderItems: (id: string) => list<OrderItem>(`/orders/${id}/items`),
  orderStats: () => get<OrderStats>("/order-stats"),

  // ── การรับสินค้า ──
  verifyPickup: (pickupCode: string) => write<PickupVerification>("POST", "/pickup-verifications", { pickupCode }),
  createPickupLog: (body: CreatePickupLogBody) => write<PickupLog>("POST", "/pickup-logs", body),
  listPickupLogs: (query?: { page?: number; limit?: number }) => list<PickupLog>("/pickup-logs", query),
};
