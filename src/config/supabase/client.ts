/**
 * Browser-side Supabase client.
 *
 * Uses @supabase/ssr v0.10 createBrowserClient.
 * This client automatically manages auth tokens in cookies
 * that the server-side client can read.
 *
 * This file is in the Config layer. It can be imported by any other layer.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
