/**
 * POST /api/v1/stripe/checkout
 *
 * Create a Stripe Checkout Session for upgrading the caller's tenant to Pro.
 * Auth: any authenticated user (the upgrade applies to their tenant).
 * Returns the hosted Checkout URL to redirect to.
 *
 * Inert when billing is disabled (no STRIPE_SECRET_KEY / STRIPE_PRO_PRICE_ID).
 */

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/config/supabase/server";
import { serverEnv } from "@/config/env";
import { getProPriceId, isBillingEnabled } from "@/lib/stripe";
import { createProCheckout } from "@/services/subscriptionService";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import type { ApiResponse } from "@/types/api";

export async function POST() {
  if (!isBillingEnabled()) {
    return NextResponse.json<ApiResponse<{ url: string }>>(
      { data: null, error: "Billing ist nicht aktiviert." },
      { status: 503 },
    );
  }

  try {
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<{ url: string }>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId } = authResult.data;

    // Fetch tenant name + the caller's email for the checkout session.
    const admin = createAdminClient();
    const { data: tenant } = await admin
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .single();

    const { data: employee } = await admin
      .from("employees")
      .select("email")
      .eq("id", authResult.data.employeeId)
      .single();

    const priceId = getProPriceId()!;
    const result = await createProCheckout(
      tenantId,
      tenant?.name ?? "Unbekannt",
      employee?.email ?? "",
      priceId,
      serverEnv.NEXT_PUBLIC_APP_URL,
    );

    if (!result.data) {
      return NextResponse.json<ApiResponse<{ url: string }>>(
        { data: null, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json<ApiResponse<{ url: string }>>(
      { data: result.data, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Checkout creation error:", error);
    return NextResponse.json<ApiResponse<{ url: string }>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
