/**
 * GET/POST /api/v1/projects
 *
 * GET: List projects for the tenant (all roles).
 * POST: Create a project (admin only).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import {
  listProjectsWithStats,
  createProject,
} from "@/services/projectService";
import { createProjectSchema } from "@/types/project";
import type { ApiResponse } from "@/types/api";
import type { Project, ProjectWithStats } from "@/types";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<ProjectWithStats[]>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId } = authResult.data;
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("all") === "true";
    const assignedOnly = searchParams.get("assigned") === "true";

    const result = await listProjectsWithStats(
      supabase,
      tenantId,
      includeInactive,
      assignedOnly ? employeeId : undefined,
    );
    return NextResponse.json<ApiResponse<ProjectWithStats[]>>(
      { data: result.data, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("List projects error:", error);
    return NextResponse.json<ApiResponse<ProjectWithStats[]>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<Project>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, role } = authResult.data;
    if (role !== "admin") {
      return NextResponse.json<ApiResponse<Project>>(
        { data: null, error: "Nur Administratoren können Projekte erstellen." },
        { status: 403 },
      );
    }

    const body: unknown = await request.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json<ApiResponse<Project>>(
        { data: null, error: firstError?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    const result = await createProject(supabase, tenantId, parsed.data);
    if (!result.data) {
      return NextResponse.json<ApiResponse<Project>>(
        { data: null, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json<ApiResponse<Project>>(
      { data: result.data, error: null },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json<ApiResponse<Project>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
