"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircleIcon } from "./shop-icons";

/**
 * Toast แจ้งผลสำเร็จ 4 วินาที (design-system.md ข้อ 8.4) — ห้ามใช้แจ้ง error ที่ผู้ใช้ต้องแก้
 * component ชั่วคราวจนกว่า AppShell จะมี toast container ให้
 */
interface ToastItem {
  id: number;
  message: string;
}

const ToastContext = createContext<(message: string) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message }]);
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-center gap-3 md:inset-x-auto md:right-12 md:items-end">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className="fade-slide-up pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-3 text-body-md text-on-surface shadow-xl"
          >
            <CheckCircleIcon className="h-5 w-5 shrink-0 text-success" />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (message: string) => void {
  return useContext(ToastContext);
}
