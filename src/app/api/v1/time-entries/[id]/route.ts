/**
 * PATCH /api/v1/time-entries/:id
 *
 * Manager edit of a time entry with mandatory reason.
 * Creates audit trail records for each changed field (Story 4.1).
 *
 * GET /api/v1/time-entries/:id
 *
 * Get a single time entry with its audit trail.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { editTimeEntry, getTimeEntryAuditTrail } from "@/services/timeEntryEditService";
import { editTimeEntrySchema } from "@/types/correction";
import type { ApiResponse } from "@/types/api";
import type { TimeEntry } from "@/types/database";
import type { TimeEntryAudit } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH — Edit a time entry (manager/admin only).
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Auth check
    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<TimeEntry>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId, role } = authResult.data;

    // Role check — only manager/admin can edit
    if (role === "employee") {
      return NextResponse.json<ApiResponse<TimeEntry>>(
        { data: null, error: "Nur Manager oder Administratoren können Zeiteinträge bearbeiten" },
        { status: 403 },
      );
    }

    // Validate input
    const body: unknown = await request.json();
    const parsed = editTimeEntrySchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json<ApiResponse<TimeEntry>>(
        { data: null, error: firstError?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    const { reason, ...changes } = parsed.data;

    // Check that at least one field is being changed
    if (Object.keys(changes).length === 0) {
      return NextResponse.json<ApiResponse<TimeEntry>>(
        { data: null, error: "Keine Änderungen angegeben" },
        { status: 400 },
      );
    }

    // Apply edit with audit trail
    const result = await editTimeEntry(
      supabase,
      tenantId,
      employeeId,
      id,
      changes,
      reason,
    );

    if (!result.data) {
      return NextResponse.json<ApiResponse<TimeEntry>>(
        { data: null, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json<ApiResponse<TimeEntry>>(
      { data: result.data, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Time entry edit error:", error);
    return NextResponse.json<ApiResponse<TimeEntry>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}

/**
 * GET — Retrieve a time entry's audit trail.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Auth check
    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<TimeEntryAudit[]>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId } = authResult.data;

    const result = await getTimeEntryAuditTrail(supabase, tenantId, id);

    if (!result.data) {
      return NextResponse.json<ApiResponse<TimeEntryAudit[]>>(
        { data: null, error: result.error },
        { status: 404 },
      );
    }

    return NextResponse.json<ApiResponse<TimeEntryAudit[]>>(
      { data: result.data, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Audit trail fetch error:", error);
    return NextResponse.json<ApiResponse<TimeEntryAudit[]>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
