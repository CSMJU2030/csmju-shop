import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    // React Compiler rules ใหม่ของ eslint-config-next 16 — โค้ดเดิมโหลดข้อมูลใน useEffect
    // ให้เป็น warning ไว้ก่อน แล้วค่อยทยอยแก้
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "src/lib/vendor/**"]),
]);

export default eslintConfig;
