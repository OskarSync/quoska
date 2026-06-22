/**
 * Next.js middleware — Auth session refresh + route protection.
 *
 * Handles:
 * 1. Supabase auth session refresh on every request
 * 2. Protected route redirects (unauthenticated → /login)
 * 3. Auth page redirects (authenticated → /app/dashboard)
 *
 * API routes (/api/*) are excluded — they handle their own auth.
 */

import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/config/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware entirely for API routes — they handle auth internally
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Skip static assets
  const isPublicAsset =
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/favicon.ico" ||
    pathname === "/sw.js" ||
    pathname === "/manifest.json";

  if (isPublicAsset) {
    return NextResponse.next();
  }

  // Refresh the Supabase session
  const { supabase, response } = await updateSession(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user;
  const isAuthPage =
    pathname === "/login" || pathname === "/register";
  const isOAuthCallback = pathname.startsWith("/auth/callback");
  const isHomePage = pathname === "/";
  const isAppRoute =
    pathname.startsWith("/app") || pathname === "/setup";

  // Redirect authenticated users away from auth pages
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/app/dashboard", request.url));
  }

  // Setup completeness check — redirect to /setup if tenant not fully set up
  if (isLoggedIn) {
    const tenantId = user?.app_metadata?.tenant_id as string | undefined;
    if (tenantId) {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("setup_complete")
        .eq("id", tenantId)
        .single();

      if (tenant && !tenant.setup_complete && pathname !== "/setup") {
        return NextResponse.redirect(new URL("/setup", request.url));
      }
      if (tenant && tenant.setup_complete && pathname === "/setup") {
        return NextResponse.redirect(new URL("/app/dashboard", request.url));
      }
    }
  }

  // Allow authenticated users on all other routes
  if (isLoggedIn) {
    return response;
  }

  // Allow unauthenticated users on public pages
  if (isAuthPage || isHomePage) {
    return response;
  }

  // OAuth callback runs before the session cookie exists — always allow
  // through so the code-for-session exchange can complete.
  if (isOAuthCallback) {
    return response;
  }

  // Redirect unauthenticated users trying to access protected routes
  if (isAppRoute) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|sw\\.js|manifest\\.json).*)",
  ],
};
