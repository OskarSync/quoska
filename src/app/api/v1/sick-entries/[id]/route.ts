/**
 * PATCH /api/v1/sick-entries/:id — Update a sick entry.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { updateSickEntryRecord } from "@/services/sickEntryService";
import { updateSickEntrySchema } from "@/types/sick";
import type { ApiResponse } from "@/types/api";
import type { SickEntry } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
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

    const body: unknown = await request.json();
    const parsed = updateSickEntrySchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json<ApiResponse<SickEntry>>(
        { data: null, error: firstError?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    const result = await updateSickEntryRecord(
      supabase, tenantId, employeeId, role, id, parsed.data,
    );

    if (!result.data) {
      return NextResponse.json<ApiResponse<SickEntry>>(
        { data: null, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json<ApiResponse<SickEntry>>(
      { data: result.data, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Sick entry update error:", error);
    return NextResponse.json<ApiResponse<SickEntry>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
