import js from "@eslint/js";
import ts from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import nextConfig from "eslint-config-next";
import quoskaRules from "./tools/eslint-rules/index.js";

const config = [
  js.configs.recommended,
  ...nextConfig,
  {
    files: ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": ts,
      "@quoska/legal": quoskaRules,
    },
    rules: {
      // Use TypeScript-aware unused vars rule, not the base JS one
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // TS handles undefined checks; base rule false-positives on JSX globals
      "no-undef": "off",

      // TypeScript recommended rules
      ...ts.configs.recommended.rules,

      // File size limit (NFR-8)
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],

      // ========================================
      // QUOSKA LEGAL COMPLIANCE RULES
      // ========================================

      // §16 ArbZG — Server timestamps only, no client-side Date
      "@quoska/legal/no-client-timestamps": "error",

      // Revisionssicherheit — No hard deletes on time entries
      "@quoska/legal/no-hard-delete": "error",

      // DSGVO — Time data endpoints require authentication
      "@quoska/legal/require-auth-middleware": "error",

      // Revisionssicherheit / GoBD — Mutations need audit fields
      "@quoska/legal/require-audit-fields": "error",

      // ArbZG — No backdating time entries (tagesaktuell)
      "@quoska/legal/no-backdating": "warn",

      // §4 ArbZG — Break rules (30min/6h, 45min/9h)
      "@quoska/legal/enforce-break-rules": "warn",

      // §3 ArbZG — Max working hours (10h/day, 48h/week)
      "@quoska/legal/enforce-max-working-hours": "warn",

      // §5 ArbZG — Rest period (11h between shifts)
      "@quoska/legal/enforce-rest-period": "warn",

      // NFR-9 — Layered architecture enforcement
      "@quoska/legal/no-cross-layer-imports": "error",
    },
  },
  {
    // Ignore patterns
ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".next/**",
      ".next-e2e/**",
      "out/**",
      "next-env.d.ts",
      "tools/eslint-rules/**",
      "tmp-next/**",
      "scripts/**",
    ],
  },
];

export default config;
