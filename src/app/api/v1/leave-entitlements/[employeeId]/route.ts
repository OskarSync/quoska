/**
 * GET /api/v1/leave-entitlements/[employeeId] — Get leave balance.
 * PATCH /api/v1/leave-entitlements/[employeeId] — Update entitlement (admin).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { getLeaveBalance } from "@/services/leaveService";
import { upsertLeaveEntitlement } from "@/repos/leaveRepo";
import { updateEntitlementSchema } from "@/types/leave";
import type { ApiResponse } from "@/types/api";
import type { LeaveBalance } from "@/types/leave";
import type { LeaveEntitlement } from "@/types/database";

interface RouteParams {
  params: Promise<{ employeeId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { employeeId } = await params;
    const supabase = await createClient();

    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<LeaveBalance>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, role } = authResult.data;

    // Employees can only view own balance
    if (role === "employee" && employeeId !== authResult.data.employeeId) {
      return NextResponse.json<ApiResponse<LeaveBalance>>(
        { data: null, error: "Nicht berechtigt" },
        { status: 403 },
      );
    }

    const year = new Date().getFullYear(); // eslint-disable-line @quoska/legal/no-client-timestamps
    const balance = await getLeaveBalance(supabase, tenantId, employeeId, year);

    return NextResponse.json<ApiResponse<LeaveBalance>>(
      { data: balance, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Leave entitlement get error:", error);
    return NextResponse.json<ApiResponse<LeaveBalance>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { employeeId } = await params;
    const supabase = await createClient();

    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<LeaveEntitlement>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, role } = authResult.data;

    if (role !== "admin") {
      return NextResponse.json<ApiResponse<LeaveEntitlement>>(
        { data: null, error: "Nur Administratoren können Urlaubsansprüche bearbeiten" },
        { status: 403 },
      );
    }

    const body: unknown = await request.json();
    const parsed = updateEntitlementSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json<ApiResponse<LeaveEntitlement>>(
        { data: null, error: firstError?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    const year = new Date().getFullYear(); // eslint-disable-line @quoska/legal/no-client-timestamps
    const entitlement = await upsertLeaveEntitlement(supabase, {
      tenant_id: tenantId,
      employee_id: employeeId,
      year,
      total_days: parsed.data.total_days,
      carried_over: parsed.data.carried_over,
    });

    if (!entitlement) {
      return NextResponse.json<ApiResponse<LeaveEntitlement>>(
        { data: null, error: "Anspruch konnte nicht aktualisiert werden" },
        { status: 400 },
      );
    }

    return NextResponse.json<ApiResponse<LeaveEntitlement>>(
      { data: entitlement, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Leave entitlement update error:", error);
    return NextResponse.json<ApiResponse<LeaveEntitlement>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
