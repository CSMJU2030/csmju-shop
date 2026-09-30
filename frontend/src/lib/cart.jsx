'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'csmju-cart';
const CartContext = createContext(null);

export function CartProvider({ children }) {
  // เริ่มด้วยค่าว่างเสมอ แล้วค่อยอ่าน localStorage ตอน mount
  // เพื่อให้ HTML ที่ server render ตรงกับรอบแรกของ client (กัน hydration mismatch)
  const [lines, setLines] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      /* โหมดส่วนตัวของเบราว์เซอร์อาจอ่านไม่ได้ */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* เขียนไม่ได้ก็ยังใช้ตะกร้าในหน่วยความจำได้ */
    }
  }, [lines, ready]);

  const value = useMemo(() => {
    const add = (variant, product) =>
      setLines((prev) => {
        const found = prev.find((l) => l.variant_id === variant.variant_id);
        if (found) {
          return prev.map((l) =>
            l.variant_id === variant.variant_id ? { ...l, quantity: l.quantity + 1 } : l,
          );
        }
        return [
          ...prev,
          {
            variant_id: variant.variant_id,
            variant_name: variant.variant_name,
            price: Number(variant.price),
            quantity: 1,
            product_name: product.name,
            category: product.category,
            image_url: product.image_url ?? null,
            is_preorder: product.is_preorder === true,
          },
        ];
      });

    const setQuantity = (variant_id, quantity) =>
      setLines((prev) =>
        quantity <= 0
          ? prev.filter((l) => l.variant_id !== variant_id)
          : prev.map((l) => (l.variant_id === variant_id ? { ...l, quantity } : l)),
      );

    const remove = (variant_id) => setLines((prev) => prev.filter((l) => l.variant_id !== variant_id));
    const clear = () => setLines([]);

    const count = lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);

    return { lines, add, setQuantity, remove, clear, count, subtotal, ready };
  }, [lines, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart ต้องอยู่ภายใน CartProvider');
  return ctx;
}
