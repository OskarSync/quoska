/**
 * GET /api/v1/billing/status
 *
 * Current plan + billing capability for the caller's tenant.
 * Used by the settings/billing UI to decide what to render.
 *
 * Auth: any authenticated user.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getActivePlan } from "@/services/subscriptionService";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { isBillingEnabled } from "@/lib/stripe";
import type { ApiResponse } from "@/types/api";
import type { Plan } from "@/types/tenant";

export interface BillingStatus {
  plan: Plan;
  /** Server-side: can this deployment process payments? */
  billingEnabled: boolean;
  /** Whether the billing/upgrade UI should be visible to this client. */
  canUpgrade: boolean;
  /** Free-plan employee limit (for display). null when unlimited. */
  freeLimit: number | null;
}

const FREE_PLAN_EMPLOYEE_LIMIT = 3;

export async function GET() {
  try {
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<BillingStatus>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const planResult = await getActivePlan(supabase, authResult.data.tenantId);
    const plan = planResult.data?.plan ?? "free";

    const billingEnabled = planResult.data?.billingEnabled ?? false;
    // The upgrade UI is shown whenever this deployment can process payments
    // (server-side hosted Checkout needs the secret key + price only — no
    // publishable key, since we don't use client-side Stripe Elements).
    const canUpgrade = isBillingEnabled();
    const freeLimit = plan === "free" ? FREE_PLAN_EMPLOYEE_LIMIT : null;

    return NextResponse.json<ApiResponse<BillingStatus>>(
      {
        data: {
          plan,
          billingEnabled,
          canUpgrade,
          freeLimit,
        },
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Billing status error:", error);
    return NextResponse.json<ApiResponse<BillingStatus>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
