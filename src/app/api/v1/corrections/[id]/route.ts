/**
 * PATCH /api/v1/corrections/:id
 *
 * Review a correction request (manager: approve or reject).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import {
  approveCorrectionRequest,
  rejectCorrectionRequest,
} from "@/services/correctionRequestService";
import { reviewCorrectionSchema } from "@/types/correction";
import type { ApiResponse } from "@/types/api";
import type { CorrectionRequest } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH — Approve or reject a correction request (manager/admin only).
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Auth check
    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<CorrectionRequest>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId, role } = authResult.data;

    // Role check
    if (role === "employee") {
      return NextResponse.json<ApiResponse<CorrectionRequest>>(
        { data: null, error: "Nur Manager oder Administratoren können Korrekturen prüfen" },
        { status: 403 },
      );
    }

    // Validate input
    const body: unknown = await request.json();
    const parsed = reviewCorrectionSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json<ApiResponse<CorrectionRequest>>(
        { data: null, error: firstError?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    // Route to approve or reject
    const result = parsed.data.action === "approve"
      ? await approveCorrectionRequest(supabase, tenantId, employeeId, id)
      : await rejectCorrectionRequest(
          supabase,
          tenantId,
          employeeId,
          id,
          parsed.data.review_note,
        );

    if (!result.data) {
      return NextResponse.json<ApiResponse<CorrectionRequest>>(
        { data: null, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json<ApiResponse<CorrectionRequest>>(
      { data: result.data, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Correction review error:", error);
    return NextResponse.json<ApiResponse<CorrectionRequest>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
