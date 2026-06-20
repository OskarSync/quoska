/**
 * POST /api/v1/clock/in
 *
 * Clock in — create a new time entry with server-generated timestamp.
 * Prevents concurrent active entries (FR-3).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/config/supabase/server";
import { getTodayDate } from "@/config/server/timestamps";
import { getEmployeeFromAuth, clockIn } from "@/services/timeEntryService";
import type { ApiResponse } from "@/types/api";
import type { TimeEntry } from "@/types/database";

const clockInBodySchema = z.object({
  notes: z.string().max(500).optional(),
  projectId: z.string().uuid().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Auth check
    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<TimeEntry>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId } = authResult.data;

    // Validate input
    const body: unknown = await request.json();
    const parsed = clockInBodySchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json<ApiResponse<TimeEntry>>(
        { data: null, error: firstError?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    // Clock in
    const result = await clockIn(
      supabase,
      tenantId,
      employeeId,
      getTodayDate(),
      parsed.data.notes,
      parsed.data.projectId,
    );

    if (!result.data) {
      const status = result.error?.includes("bereits eingestempelt")
        ? 409
        : 500;
      return NextResponse.json<ApiResponse<TimeEntry>>(
        { data: null, error: result.error },
        { status },
      );
    }

    return NextResponse.json<ApiResponse<TimeEntry>>(
      { data: result.data, error: null },
      { status: 201 },
    );
  } catch (error) {
    console.error("Clock in error:", error);
    return NextResponse.json<ApiResponse<TimeEntry>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
