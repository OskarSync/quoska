/**
 * PATCH /api/v1/leave-requests/:id — Review leave request (manager/admin).
 * DELETE /api/v1/leave-requests/:id — Cancel leave request (own employee).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { reviewLeaveRequest, cancelLeaveRequest } from "@/services/leaveService";
import { reviewLeaveSchema } from "@/types/leave";
import { getNowIso } from "@/config/server/timestamps";
import type { ApiResponse } from "@/types/api";
import type { LeaveRequest } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<LeaveRequest>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId, role } = authResult.data;

    if (role === "employee") {
      return NextResponse.json<ApiResponse<LeaveRequest>>(
        { data: null, error: "Nur Manager oder Administratoren können Urlaubsanträge prüfen" },
        { status: 403 },
      );
    }

    const body: unknown = await request.json();
    const parsed = reviewLeaveSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json<ApiResponse<LeaveRequest>>(
        { data: null, error: firstError?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    const nowIso = getNowIso();
    const result = await reviewLeaveRequest(
      supabase, tenantId, employeeId, id,
      parsed.data.action, parsed.data.review_note, nowIso,
    );

    if (!result.data) {
      return NextResponse.json<ApiResponse<LeaveRequest>>(
        { data: null, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json<ApiResponse<LeaveRequest>>(
      { data: result.data, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Leave review error:", error);
    return NextResponse.json<ApiResponse<LeaveRequest>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<LeaveRequest>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId } = authResult.data;

    const result = await cancelLeaveRequest(supabase, tenantId, employeeId, id);

    if (!result.data) {
      return NextResponse.json<ApiResponse<LeaveRequest>>(
        { data: null, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json<ApiResponse<LeaveRequest>>(
      { data: result.data, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Leave cancel error:", error);
    return NextResponse.json<ApiResponse<LeaveRequest>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
