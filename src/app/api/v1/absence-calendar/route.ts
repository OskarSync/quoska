/**
 * GET /api/v1/absence-calendar — Get absences for a date range.
 *
 * Query params: start_date (YYYY-MM-DD), end_date (YYYY-MM-DD)
 * Returns combined approved leaves + sick entries for calendar view.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { getAbsencesForPeriod, type AbsenceEntry } from "@/services/absenceService";
import type { ApiResponse } from "@/types/api";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<AbsenceEntry[]>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId } = authResult.data;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    if (!startDate || !endDate) {
      return NextResponse.json<ApiResponse<AbsenceEntry[]>>(
        { data: null, error: "start_date und end_date sind erforderlich" },
        { status: 400 },
      );
    }

    if (startDate > endDate) {
      return NextResponse.json<ApiResponse<AbsenceEntry[]>>(
        { data: null, error: "Startdatum muss vor Enddatum liegen" },
        { status: 400 },
      );
    }

    const absences = await getAbsencesForPeriod(
      supabase, tenantId, startDate, endDate,
    );

    return NextResponse.json<ApiResponse<AbsenceEntry[]>>(
      { data: absences, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Absence calendar error:", error);
    return NextResponse.json<ApiResponse<AbsenceEntry[]>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
