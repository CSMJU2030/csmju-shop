"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product, ProductVariant } from "./types";

/** รายการในตะกร้า — เก็บในเบราว์เซอร์ (ไม่มี token หรือข้อมูลส่วนบุคคล) ราคาหน่วยสตางค์ */
export interface CartLine {
  variantId: string;
  variantName: string;
  price: number;
  quantity: number;
  productId: string;
  productName: string;
  category: string;
  imageUrl: string | null;
  isPreorder: boolean;
}

interface CartValue {
  lines: CartLine[];
  ready: boolean;
  count: number;
  subtotal: number;
  add: (variant: ProductVariant, product: Product) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
}

const KEY = "csmju-shop-cart-v2";
const CartContext = createContext<CartValue | null>(null);

function isCartLine(value: unknown): value is CartLine {
  const v = value as CartLine;
  return !!v && typeof v.variantId === "string" && typeof v.price === "number" && typeof v.quantity === "number";
}

export function CartProvider({ children }: { children: ReactNode }) {
  // เริ่มว่างเสมอแล้วอ่านจาก storage ตอน mount (กัน hydration mismatch)
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setLines(parsed.filter(isCartLine));
    } catch {
      /* โหมดส่วนตัวของเบราว์เซอร์อาจอ่านไม่ได้ ใช้ตะกร้าในหน่วยความจำแทน */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* เขียนไม่ได้ก็ยังใช้ตะกร้าในหน่วยความจำได้ */
    }
  }, [lines, ready]);

  const value = useMemo<CartValue>(() => {
    const add = (variant: ProductVariant, product: Product) =>
      setLines((prev) => {
        const found = prev.find((l) => l.variantId === variant.id);
        if (found) {
          return prev.map((l) => (l.variantId === variant.id ? { ...l, quantity: Math.min(l.quantity + 1, 99) } : l));
        }
        return [
          ...prev,
          {
            variantId: variant.id,
            variantName: variant.variantName,
            price: variant.price,
            quantity: 1,
            productId: product.id,
            productName: product.name,
            category: product.category,
            imageUrl: product.imageUrl ?? null,
            isPreorder: product.isPreorder,
          },
        ];
      });

    const setQuantity = (variantId: string, quantity: number) =>
      setLines((prev) =>
        quantity <= 0
          ? prev.filter((l) => l.variantId !== variantId)
          : prev.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(quantity, 99) } : l)),
      );

    return {
      lines,
      ready,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      subtotal: lines.reduce((s, l) => s + l.price * l.quantity, 0),
      add,
      setQuantity,
      remove: (variantId) => setLines((prev) => prev.filter((l) => l.variantId !== variantId)),
      clear: () => setLines([]),
    };
  }, [lines, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart ต้องอยู่ภายใน CartProvider");
  return ctx;
}
