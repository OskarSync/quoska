import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Minimal env so config/env.ts zod validation passes in unit tests.
    // Tests that need specific values override via vi.stubEnv.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
      NODE_ENV: "test",
    },
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      // ESLint RuleTester tests run via node, not vitest
      "**/tools/eslint-rules/**",
      // Playwright tests run via `npm run test:e2e`
      "**/tests/e2e/**",
    ],
  },
});
