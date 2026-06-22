/**
 * /auth/callback — OAuth (Google) redirect target.
 *
 * After Google redirects back with ?code=…, Supabase exchanges it for a
 * session here. Then we route based on whether the user has a tenant/employee
 * yet:
 *   - Returning user (has employee) → /app/dashboard
 *   - First-time Google signup (no employee yet) → /setup (wizard creates
 *     their tenant using their Google identity)
 *
 * Email/password auth bypasses this route entirely; it's OAuth-only.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createClient();

  // Exchange the OAuth code for a session (sets the auth cookie).
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // Decide where to send them based on whether they have an employee record.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();

    // No employee → brand-new Google signup → run the setup wizard, which
    // creates their tenant + admin employee (reuses /api/v1/auth/register).
    if (!employee) {
      return NextResponse.redirect(`${origin}/setup`);
    }
  }

  // Returning user → straight to the app.
  return NextResponse.redirect(`${origin}${next}`);
}
