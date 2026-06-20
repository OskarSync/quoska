/**
 * POST /api/v1/sick-entries/:id/au — Upload AU certificate.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { uploadAuCertificate } from "@/services/sickEntryService";
import { getNowIso } from "@/config/server/timestamps";
import type { ApiResponse } from "@/types/api";
import type { SickEntry } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<SickEntry>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId, role } = authResult.data;

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json<ApiResponse<SickEntry>>(
        { data: null, error: "Keine Datei gefunden" },
        { status: 400 },
      );
    }

    const nowIso = getNowIso();
    const result = await uploadAuCertificate(
      supabase, tenantId, employeeId, role, id, file, nowIso,
    );

    if (!result.data) {
      return NextResponse.json<ApiResponse<SickEntry>>(
        { data: null, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json<ApiResponse<SickEntry>>(
      { data: result.data.sickEntry, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("AU upload error:", error);
    return NextResponse.json<ApiResponse<SickEntry>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
