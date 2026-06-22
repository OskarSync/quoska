/**
 * Environment variable validation.
 *
 * Two schemas:
 * - Server: validates all required vars (including secrets)
 * - Client: validates only NEXT_PUBLIC_* vars (Next.js inlines these)
 *
 * Lazy-validated on first access so the app can build without a .env file.
 */

import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().min(1).default("http://localhost:3000"),
  // "true" to show the "Mit Google anmelden" button. Requires Google OAuth
  // configured on the Supabase project (hosted) — leave unset for local dev.
  NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED: z.string().optional(),
});

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_TEAM_PRICE_ID: z.string().optional(),
  STRIPE_BUSINESS_PRICE_ID: z.string().optional(),
  STRIPE_PRO_PRICE_ID: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
});

type PublicEnv = z.infer<typeof publicEnvSchema>;
type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Public env vars — safe for browser code.
 * Only validates NEXT_PUBLIC_* vars since those are inlined by Next.js.
 */
export const env: PublicEnv = new Proxy({} as PublicEnv, {
  get(_target, prop: string) {
    const parsed = publicEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED,
    });
    return parsed[prop as keyof PublicEnv];
  },
});

/**
 * Server-only env vars — includes secrets. Only import in server code.
 * Will throw if used in browser (env vars will be undefined).
 */
export const serverEnv: ServerEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: string) {
    const parsed = serverEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      NODE_ENV: process.env.NODE_ENV,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
      STRIPE_TEAM_PRICE_ID: process.env.STRIPE_TEAM_PRICE_ID,
      STRIPE_BUSINESS_PRICE_ID: process.env.STRIPE_BUSINESS_PRICE_ID,
      STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
    });
    return parsed[prop as keyof ServerEnv];
  },
});

export type Env = ServerEnv;
