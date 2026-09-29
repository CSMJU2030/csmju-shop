"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Me } from "@/lib/types";

/** ตัวตนของผู้ใช้ที่ root layout ถามจาก backend ไว้แล้ว — ใช้ตัดสินว่าจะแสดงปุ่ม/เมนูอะไร */
const SessionContext = createContext<Me | null>(null);

export function SessionProvider({ me, children }: { me: Me | null; children: ReactNode }) {
  return <SessionContext.Provider value={me}>{children}</SessionContext.Provider>;
}

export function useMe(): Me | null {
  return useContext(SessionContext);
}
