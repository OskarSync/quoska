/**
 * PATCH /api/v1/employees/[id] — Update an employee
 * PUT /api/v1/employees/[id] — Deactivate an employee
 *
 * Auth: admin only for both operations.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { createAdminClient } from "@/config/supabase/server";
import { updateEmployeeSchema } from "@/types/employee";
import {
  updateEmployee,
  deactivateEmployee,
} from "@/services/employeeService";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import type { ApiResponse } from "@/types/api";
import type { Employee } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: Request,
  { params }: RouteParams,
) {
  try {
    const { id } = await params;
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
    const parsed = updateEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json<ApiResponse<Employee>>(
        { data: null, error: firstError?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    const adminClient = createAdminClient();
    const result = await updateEmployee(
      supabase,
      adminClient,
      tenantId,
      id,
      parsed.data,
    );

    if (!result.data) {
      return NextResponse.json<ApiResponse<Employee>>(
        { data: null, error: result.error },
        { status: 500 },
      );
    }

    return NextResponse.json<ApiResponse<Employee>>(
      { data: result.data, error: null },
    );
  } catch (error) {
    console.error("Employee update error:", error);
    return NextResponse.json<ApiResponse<Employee>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}

export async function PUT(
  _request: Request,
  { params }: RouteParams,
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);

    if (!authResult.data) {
      return NextResponse.json<ApiResponse<{ id: string }>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, role, employeeId } = authResult.data;

    if (role !== "admin") {
      return NextResponse.json<ApiResponse<{ id: string }>>(
        { data: null, error: "Keine Berechtigung" },
        { status: 403 },
      );
    }

    const adminClient = createAdminClient();
    const result = await deactivateEmployee(
      supabase,
      adminClient,
      tenantId,
      id,
      employeeId,
    );

    if (!result.data) {
      const status =
        result.error?.includes("nicht gefunden") ? 404 :
        result.error?.includes("selbst") ? 400 : 500;
      return NextResponse.json<ApiResponse<{ id: string }>>(
        { data: null, error: result.error },
        { status },
      );
    }

    return NextResponse.json<ApiResponse<{ id: string }>>(
      { data: result.data, error: null },
    );
  } catch (error) {
    console.error("Employee deactivate error:", error);
    return NextResponse.json<ApiResponse<{ id: string }>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
