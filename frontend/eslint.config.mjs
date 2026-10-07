// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

// eslint-config-next ยังไม่อยู่ใน dependency whitelist ของ standards 1.0.x (ARC-02)
// จึงใช้ชุดกฎของ typescript-eslint แทน
export default tseslint.config(
  { ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "src/lib/api-types.ts", "src/lib/vendor/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
);
