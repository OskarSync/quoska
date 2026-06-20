/**
 * GET /api/v1/time-entries?employeeId=...&startDate=...&endDate=...
 *
 * Manager/admin: fetch time entries for a specific employee in a date range.
 * Returns entries with net minutes calculated.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getNowIso } from "@/config/server/timestamps";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { getTimeEntriesByDateRange } from "@/repos/timeEntryRepo";
import { netMinutesForEntry, netMinutesForRunningEntry } from "@/services/overtimeService";
import type { ApiResponse } from "@/types/api";
import type { TimeEntry } from "@/types/database";
import { z } from "zod";

export interface TimeEntryWithNet extends TimeEntry {
  netMinutes: number;
}

export interface EmployeeEntriesResponse {
  entries: TimeEntryWithNet[];
}

const querySchema = z.object({
  employeeId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);

    if (!authResult.data) {
      return NextResponse.json<ApiResponse<EmployeeEntriesResponse>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, role } = authResult.data;

    if (role === "employee") {
      return NextResponse.json<ApiResponse<EmployeeEntriesResponse>>(
        { data: null, error: "Keine Berechtigung." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      employeeId: searchParams.get("employeeId"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json<ApiResponse<EmployeeEntriesResponse>>(
        { data: null, error: firstError?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    const { employeeId, startDate, endDate } = parsed.data;
    const nowIso = getNowIso();

    const entries = await getTimeEntriesByDateRange(
      supabase,
      tenantId,
      employeeId,
      startDate,
      endDate,
    );

    const entriesWithNet: TimeEntryWithNet[] = entries.map((entry) => ({
      ...entry,
      netMinutes: entry.clock_out
        ? netMinutesForEntry(entry)
        : netMinutesForRunningEntry(entry, nowIso),
    }));

    return NextResponse.json<ApiResponse<EmployeeEntriesResponse>>(
      { data: { entries: entriesWithNet }, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Employee time entries error:", error);
    return NextResponse.json<ApiResponse<EmployeeEntriesResponse>>(
      { data: null, error: "Ein unerwartender Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
