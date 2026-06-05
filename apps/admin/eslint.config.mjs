import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // eslint-plugin-react@7.x calls context.getFilename() which was removed in ESLint 10.
  // Providing an explicit version bypasses that runtime detection path entirely.
  { settings: { react: { version: "19.0" } } },
]);

export default eslintConfig;
