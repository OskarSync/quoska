/**
 * Server-side Supabase clients for Server Components and Route Handlers.
 *
 * Two clients:
 * - `createClient()` — uses the anon key + user's cookies (RLS-enforced)
 * - `createAdminClient()` — uses the service role key (bypasses RLS)
 *
 * Uses @supabase/ssr v0.10 createServerClient.
 *
 * This file is in the Config layer. It can be imported by any other layer.
 */

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

import { serverEnv } from "@/config/env";

/**
 * Create a server-side Supabase client scoped to the current request.
 *
 * Uses the anon key and the user's session cookies, so RLS policies apply.
 * Must be called in an `async` context because it reads cookies.
 */
export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Setting cookies fails in Server Components where the response
            // headers are already sent. The middleware handles session refresh.
          }
        },
      },
    },
  );
}

/**
 * Create an admin Supabase client that bypasses Row-Level Security.
 *
 * Uses the service role key directly via @supabase/supabase-js.
 * ONLY use for: tenant setup, webhooks, system operations.
 * NEVER use for user-facing queries where RLS should apply.
 */
export function createAdminClient(): SupabaseClient {
  return createSupabaseClient(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
  );
}
