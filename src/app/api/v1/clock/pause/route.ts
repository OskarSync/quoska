/**
 * POST /api/v1/clock/pause
 *
 * Start a break — pause a running time entry.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { startBreak } from "@/services/breakService";
import type { ApiResponse } from "@/types/api";
import type { BreakSession } from "@/types/database";

const pauseBodySchema = z.object({
  timeEntryId: z.string().uuid("Ungültige Zeiteintrags-ID"),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<BreakSession>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId } = authResult.data;

    const body: unknown = await request.json();
    const parsed = pauseBodySchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json<ApiResponse<BreakSession>>(
        { data: null, error: firstError?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    const result = await startBreak(
      supabase,
      tenantId,
      employeeId,
      parsed.data.timeEntryId,
    );

    if (!result.data) {
      let status = 500;
      if (result.error?.includes("eingestempelt")) status = 400;
      if (result.error?.includes("bereits")) status = 409;
      if (result.error?.includes("nicht gefunden")) status = 404;

      return NextResponse.json<ApiResponse<BreakSession>>(
        { data: null, error: result.error },
        { status },
      );
    }

    return NextResponse.json<ApiResponse<BreakSession>>(
      { data: result.data, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Pause start error:", error);
    return NextResponse.json<ApiResponse<BreakSession>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
