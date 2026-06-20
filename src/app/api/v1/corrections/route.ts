/**
 * POST /api/v1/corrections
 *
 * Submit a correction request (employee).
 * GET /api/v1/corrections
 *
 * List correction requests. Returns pending for managers,
 * own requests for employees.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import {
  submitCorrectionRequest,
  listPendingCorrections,
  listMyCorrectionRequests,
} from "@/services/correctionRequestService";
import { submitCorrectionSchema } from "@/types/correction";
import type { ApiResponse } from "@/types/api";
import type { CorrectionRequest } from "@/types/database";

/**
 * POST — Submit a correction request.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Auth check
    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<CorrectionRequest>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId } = authResult.data;

    // Validate input
    const body: unknown = await request.json();
    const parsed = submitCorrectionSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json<ApiResponse<CorrectionRequest>>(
        { data: null, error: firstError?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    const result = await submitCorrectionRequest(
      supabase,
      tenantId,
      employeeId,
      parsed.data.time_entry_id,
      parsed.data.proposed_change,
      parsed.data.reason,
    );

    if (!result.data) {
      return NextResponse.json<ApiResponse<CorrectionRequest>>(
        { data: null, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json<ApiResponse<CorrectionRequest>>(
      { data: result.data, error: null },
      { status: 201 },
    );
  } catch (error) {
    console.error("Correction request error:", error);
    return NextResponse.json<ApiResponse<CorrectionRequest>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}

/**
 * GET — List correction requests.
 * Managers see all pending. Employees see their own.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Auth check
    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<CorrectionRequest[]>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId, role } = authResult.data;

    // Managers/admins see all pending
    if (role === "manager" || role === "admin") {
      const result = await listPendingCorrections(supabase, tenantId);
      return NextResponse.json<ApiResponse<CorrectionRequest[]>>(
        { data: result.data, error: null },
        { status: 200 },
      );
    }

    // Employees see their own
    const result = await listMyCorrectionRequests(supabase, tenantId, employeeId);
    return NextResponse.json<ApiResponse<CorrectionRequest[]>>(
      { data: result.data, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Correction list error:", error);
    return NextResponse.json<ApiResponse<CorrectionRequest[]>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
