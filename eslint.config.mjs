import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      // The extraction layer accepts untrusted JSON by design; validation
      // happens at runtime in `lib/ai/schemas.ts`.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "prisma/generated/**",
    "next-env.d.ts",
    "*.config.mjs",
  ]),
]);
