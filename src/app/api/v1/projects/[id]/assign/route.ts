/**
 * GET/POST/DELETE /api/v1/projects/[id]/assign
 *
 * GET: List assigned employee IDs for a project.
 * POST: Assign employees to a project (admin only).
 * PUT: Replace all assignments with the given employee IDs (admin only).
 * DELETE: Unassign an employee from a project (admin only).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { assignEmployees, unassignEmployee, replaceAssignments } from "@/services/projectService";
import { getAssignmentsForProject } from "@/repos/projectRepo";
import { assignEmployeesSchema } from "@/types/project";
import type { ApiResponse } from "@/types/api";
import { z } from "zod";

const unassignSchema = z.object({
  employee_id: z.string().uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<string[]>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const result = await getAssignmentsForProject(
      supabase,
      authResult.data.tenantId,
      projectId,
    );

    const employeeIds = result.map((a) => a.employee_id);
    return NextResponse.json<ApiResponse<string[]>>(
      { data: employeeIds, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get assignments error:", error);
    return NextResponse.json<ApiResponse<string[]>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<boolean>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    if (authResult.data.role !== "admin") {
      return NextResponse.json<ApiResponse<boolean>>(
        { data: null, error: "Nur Administratoren können Mitarbeiter zuordnen." },
        { status: 403 },
      );
    }

    const body: unknown = await request.json();
    const parsed = assignEmployeesSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json<ApiResponse<boolean>>(
        { data: null, error: firstError?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    const result = await assignEmployees(
      supabase, authResult.data.tenantId, projectId, parsed.data.employee_ids,
    );

    if (!result.data) {
      return NextResponse.json<ApiResponse<boolean>>(
        { data: null, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json<ApiResponse<boolean>>(
      { data: true, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Assign error:", error);
    return NextResponse.json<ApiResponse<boolean>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}

/** PUT: Replace all assignments with the given employee IDs. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<boolean>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    if (authResult.data.role !== "admin") {
      return NextResponse.json<ApiResponse<boolean>>(
        { data: null, error: "Nur Administratoren können Mitarbeiter zuordnen." },
        { status: 403 },
      );
    }

    const body: unknown = await request.json();
    const parsed = assignEmployeesSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json<ApiResponse<boolean>>(
        { data: null, error: firstError?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    const result = await replaceAssignments(
      supabase, authResult.data.tenantId, projectId, parsed.data.employee_ids,
    );

    if (!result.data) {
      return NextResponse.json<ApiResponse<boolean>>(
        { data: null, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json<ApiResponse<boolean>>(
      { data: true, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Replace assignments error:", error);
    return NextResponse.json<ApiResponse<boolean>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<boolean>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    if (authResult.data.role !== "admin") {
      return NextResponse.json<ApiResponse<boolean>>(
        { data: null, error: "Nur Administratoren können Zuordnungen entfernen." },
        { status: 403 },
      );
    }

    const body: unknown = await request.json();
    const parsed = unassignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<boolean>>(
        { data: null, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    const result = await unassignEmployee(
      supabase, authResult.data.tenantId, projectId, parsed.data.employee_id,
    );

    if (!result.data) {
      return NextResponse.json<ApiResponse<boolean>>(
        { data: null, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json<ApiResponse<boolean>>(
      { data: true, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Unassign error:", error);
    return NextResponse.json<ApiResponse<boolean>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
