/**
 * POST /api/v1/sick-entries — Create a sick entry.
 * GET /api/v1/sick-entries — List sick entries (role-filtered).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { createSickEntryRecord, listSickEntries } from "@/services/sickEntryService";
import { createSickEntrySchema } from "@/types/sick";
import { getNowIso } from "@/config/server/timestamps";
import type { ApiResponse } from "@/types/api";
import type { SickEntry } from "@/types/database";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<SickEntry>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId, role } = authResult.data;

    const body: unknown = await request.json();
    const parsed = createSickEntrySchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json<ApiResponse<SickEntry>>(
        { data: null, error: firstError?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    // Only managers/admins can create for other employees
    if (parsed.data.employee_id && parsed.data.employee_id !== employeeId && role === "employee") {
      return NextResponse.json<ApiResponse<SickEntry>>(
        { data: null, error: "Nicht berechtigt, Krankmeldungen für andere zu erstellen" },
        { status: 403 },
      );
    }

    const nowIso = getNowIso();
    const result = await createSickEntryRecord(
      supabase, tenantId, employeeId, parsed.data, nowIso,
    );

    if (!result.data) {
      return NextResponse.json<ApiResponse<SickEntry>>(
        { data: null, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json<ApiResponse<SickEntry>>(
      { data: result.data, error: null },
      { status: 201 },
    );
  } catch (error) {
    console.error("Sick entry create error:", error);
    return NextResponse.json<ApiResponse<SickEntry>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<SickEntry[]>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId, role } = authResult.data;

    const result = await listSickEntries(supabase, tenantId, employeeId, role);
    return NextResponse.json<ApiResponse<SickEntry[]>>(
      { data: result.data, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Sick entry list error:", error);
    return NextResponse.json<ApiResponse<SickEntry[]>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
