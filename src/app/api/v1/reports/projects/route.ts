/**
 * GET /api/v1/reports/projects
 *
 * Project time report — aggregated hours per project.
 * Manager/admin only.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { getProjectReport } from "@/services/projectService";
import { projectReportQuerySchema } from "@/types/project";
import type { ApiResponse } from "@/types/api";
import type { ProjectReportRow } from "@/types";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<ProjectReportRow[]>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, role } = authResult.data;
    if (role === "employee") {
      return NextResponse.json<ApiResponse<ProjectReportRow[]>>(
        { data: null, error: "Zugriff verweigert." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = projectReportQuerySchema.safeParse({
      startDate: searchParams.get("startDate") ?? "",
      endDate: searchParams.get("endDate") ?? "",
    });

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<ProjectReportRow[]>>(
        { data: null, error: parsed.error.issues[0]?.message ?? "Ungültige Parameter" },
        { status: 400 },
      );
    }

    const result = await getProjectReport(
      supabase, tenantId, parsed.data.startDate, parsed.data.endDate,
    );

    return NextResponse.json<ApiResponse<ProjectReportRow[]>>(
      { data: result.data, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Project report error:", error);
    return NextResponse.json<ApiResponse<ProjectReportRow[]>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
