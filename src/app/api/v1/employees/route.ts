/**
 * GET /api/v1/employees — List employees (active + deactivated)
 * POST /api/v1/employees — Invite a new employee
 *
 * Auth: admin or manager for GET, admin only for POST.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { createAdminClient } from "@/config/supabase/server";
import { inviteEmployeeSchema } from "@/types/employee";
import {
  listEmployees,
  inviteEmployee,
  getPlanLimitStatus,
} from "@/services/employeeService";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import type { ApiResponse } from "@/types/api";
import type { Employee } from "@/types/database";

interface EmployeeListResponse {
  active: Employee[];
  deactivated: Employee[];
  planStatus: {
    plan: string | null;
    activeCount: number;
    limit: number | null;
    canAddMore: boolean;
  } | null;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);

    if (!authResult.data) {
      return NextResponse.json<ApiResponse<EmployeeListResponse>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, role } = authResult.data;

    if (role !== "admin" && role !== "manager") {
      return NextResponse.json<ApiResponse<EmployeeListResponse>>(
        { data: null, error: "Keine Berechtigung" },
        { status: 403 },
      );
    }

    // Use admin client to bypass RLS — we already verified the caller's role above.
    // RLS on employees requires auth.jwt()->>'tenant_id', which may not be set
    // if JWT claims haven't propagated yet (e.g. fallback auth path).
    const adminClient = createAdminClient();

    const [result, planResult] = await Promise.all([
      listEmployees(adminClient, tenantId),
      getPlanLimitStatus(adminClient, tenantId),
    ]);

    if (!result.data) {
      return NextResponse.json<ApiResponse<EmployeeListResponse>>(
        { data: null, error: result.error },
        { status: 500 },
      );
    }

    return NextResponse.json<ApiResponse<EmployeeListResponse>>(
      {
        data: {
          active: result.data.active,
          deactivated: result.data.deactivated,
          planStatus: planResult.data ?? null,
        },
        error: null,
      },
    );
  } catch (error) {
    console.error("Employee list error:", error);
    return NextResponse.json<ApiResponse<EmployeeListResponse>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);

    if (!authResult.data) {
      return NextResponse.json<ApiResponse<Employee>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, role } = authResult.data;

    if (role !== "admin") {
      return NextResponse.json<ApiResponse<Employee>>(
        { data: null, error: "Keine Berechtigung" },
        { status: 403 },
      );
    }

    const body: unknown = await request.json();
    const parsed = inviteEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json<ApiResponse<Employee>>(
        { data: null, error: firstError?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    const adminClient = createAdminClient();
    const result = await inviteEmployee(supabase, adminClient, tenantId, {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      role: parsed.data.role,
      targetHoursWeek: parsed.data.targetHoursWeek,
      bundesland: parsed.data.bundesland,
    });

    if (!result.data) {
      const status =
        result.error?.includes("Maximal") ? 403 :
        result.error?.includes("existiert bereits") ? 409 : 500;
      return NextResponse.json<ApiResponse<Employee>>(
        { data: null, error: result.error },
        { status },
      );
    }

    return NextResponse.json<ApiResponse<Employee>>(
      { data: result.data, error: null },
      { status: 201 },
    );
  } catch (error) {
    console.error("Employee invite error:", error);
    return NextResponse.json<ApiResponse<Employee>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
