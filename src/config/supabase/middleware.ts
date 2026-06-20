/**
 * Supabase middleware client for Next.js middleware.
 *
 * Handles session refresh on every request so the user stays authenticated.
 * This MUST be called in middleware on every request to keep the session alive.
 *
 * Uses @supabase/ssr v0.10 createServerClient.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { serverEnv } from "@/config/env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Set cookies on the request for downstream handlers
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          // Create a new response with the updated cookies
          supabaseResponse = NextResponse.next({ request });

          // Set cookies on the response for the browser
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Refresh the session — critical for auth to work
  await supabase.auth.getUser();

  return { supabase, response: supabaseResponse };
}
