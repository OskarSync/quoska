/**
 * POST /api/v1/clock/resume
 *
 * End a break — resume a paused time entry.
 * Enforces minimum 15-minute break duration (§4 ArbZG).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/config/supabase/server";
import { getNowIso } from "@/config/server/timestamps";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { endBreak } from "@/services/breakService";
import type { ApiResponse } from "@/types/api";
import type { BreakSession } from "@/types/database";

const resumeBodySchema = z.object({
  breakSessionId: z.string().uuid("Ungültige Pausen-ID"),
});

interface ResumeResponse {
  breakSession: BreakSession;
  breakMinutes: number;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<ResumeResponse>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId } = authResult.data;

    const body: unknown = await request.json();
    const parsed = resumeBodySchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json<ApiResponse<ResumeResponse>>(
        { data: null, error: firstError?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    const result = await endBreak(
      supabase,
      tenantId,
      employeeId,
      parsed.data.breakSessionId,
      getNowIso(),
    );

    if (!result.data) {
      let status = 500;
      if (result.error?.includes("mindestens")) status = 400;
      if (result.error?.includes("nicht gefunden")) status = 404;
      if (result.error?.includes("bereits beendet")) status = 409;

      return NextResponse.json<ApiResponse<ResumeResponse>>(
        { data: null, error: result.error },
        { status },
      );
    }

    return NextResponse.json<ApiResponse<ResumeResponse>>(
      { data: result.data, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Resume error:", error);
    return NextResponse.json<ApiResponse<ResumeResponse>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
