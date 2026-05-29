import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Guardrail do projeto: nunca window.alert/confirm/prompt — usar Dialog/AlertDialog.
      "no-alert": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Não lintar documentação, scripts shell, artefatos e cobertura.
    "docs/**",
    "scripts/**",
    "coverage/**",
  ]),
]);

export default eslintConfig;
