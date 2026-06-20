/**
 * GET/PATCH/DELETE /api/v1/projects/[id]
 *
 * GET: Get a single project (all roles).
 * PATCH: Update a project (admin only).
 * DELETE: Soft-delete a project (admin only).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { updateProject, deactivateProject } from "@/services/projectService";
import { getProjectById } from "@/repos/projectRepo";
import { updateProjectSchema } from "@/types/project";
import type { ApiResponse } from "@/types/api";
import type { Project } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<Project>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const project = await getProjectById(supabase, authResult.data.tenantId, id);
    if (!project) {
      return NextResponse.json<ApiResponse<Project>>(
        { data: null, error: "Projekt nicht gefunden." },
        { status: 404 },
      );
    }

    return NextResponse.json<ApiResponse<Project>>(
      { data: project, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get project error:", error);
    return NextResponse.json<ApiResponse<Project>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<Project>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    if (authResult.data.role !== "admin") {
      return NextResponse.json<ApiResponse<Project>>(
        { data: null, error: "Nur Administratoren können Projekte bearbeiten." },
        { status: 403 },
      );
    }

    const body: unknown = await request.json();
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json<ApiResponse<Project>>(
        { data: null, error: firstError?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    const result = await updateProject(
      supabase, authResult.data.tenantId, id, parsed.data,
    );

    if (!result.data) {
      return NextResponse.json<ApiResponse<Project>>(
        { data: null, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json<ApiResponse<Project>>(
      { data: result.data, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update project error:", error);
    return NextResponse.json<ApiResponse<Project>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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
        { data: null, error: "Nur Administratoren können Projekte löschen." },
        { status: 403 },
      );
    }

    const result = await deactivateProject(supabase, authResult.data.tenantId, id);
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
    console.error("Delete project error:", error);
    return NextResponse.json<ApiResponse<boolean>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
