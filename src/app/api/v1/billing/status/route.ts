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
import { employeeLimitForPlan } from "@/config/plans";
import type { ApiResponse } from "@/types/api";
import type { Plan } from "@/types/tenant";

export interface BillingStatus {
  plan: Plan;
  /** Server-side: can this deployment process payments? */
  billingEnabled: boolean;
  /** Whether the billing/upgrade UI should be visible to this client. */
  canUpgrade: boolean;
  /** Employee cap for the current plan (null = unlimited). */
  employeeLimit: number | null;
}

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
    // (server-side hosted Checkout needs the secret key + at least one price).
    const canUpgrade = isBillingEnabled();
    const employeeLimit = employeeLimitForPlan(plan);

    return NextResponse.json<ApiResponse<BillingStatus>>(
      {
        data: {
          plan,
          billingEnabled,
          canUpgrade,
          employeeLimit,
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
