/**
 * POST /api/v1/leave-requests — Submit a leave request (employee).
 * GET /api/v1/leave-requests — List leave requests (role-filtered).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { submitLeaveRequest, listLeaveRequests } from "@/services/leaveService";
import { submitLeaveSchema } from "@/types/leave";
import { getNowIso } from "@/config/server/timestamps";
import type { ApiResponse } from "@/types/api";
import type { LeaveRequest } from "@/types/database";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<LeaveRequest>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId } = authResult.data;

    const body: unknown = await request.json();
    const parsed = submitLeaveSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json<ApiResponse<LeaveRequest>>(
        { data: null, error: firstError?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    const nowIso = getNowIso();
    const result = await submitLeaveRequest(
      supabase, tenantId, employeeId, parsed.data, nowIso,
    );

    if (!result.data) {
      return NextResponse.json<ApiResponse<LeaveRequest>>(
        { data: null, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { data: result.data.request, error: null, warning: result.data.warning },
      { status: 201 },
    );
  } catch (error) {
    console.error("Leave request error:", error);
    return NextResponse.json<ApiResponse<LeaveRequest>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<LeaveRequest[]>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId, role } = authResult.data;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;

    const result = await listLeaveRequests(supabase, tenantId, employeeId, role, status ? { status } : undefined);
    return NextResponse.json<ApiResponse<LeaveRequest[]>>(
      { data: result.data, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Leave list error:", error);
    return NextResponse.json<ApiResponse<LeaveRequest[]>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
