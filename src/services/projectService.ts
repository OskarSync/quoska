/**
 * Project Service — Business logic for project management (Epic 11).
 *
 * Handles:
 * - CRUD for projects (admin only)
 * - Assign/unassign employees to projects
 * - Project time reports
 *
 * This file is in the Services layer. It imports from Repos, Types, Config.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project } from "@/types/database";
import type { ApiResponse } from "@/types/api";
import { success, failure } from "@/types/api";
import { getNowIso } from "@/config/server/timestamps";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectWithStats,
  ProjectReportRow,
  ProjectDetailRow,
} from "@/types/project";
import {
  createProject as repoCreate,
  getProjectById,
  listProjects as repoList,
  updateProject as repoUpdate,
  softDeleteProject,
  projectNameExists,
  assignEmployeeToProject,
  unassignEmployeeFromProject,
  getAssignmentsForEmployee,
  getAssignmentsForProject,
  getProjectReportRows,
  getProjectDetailRows,
} from "@/repos/projectRepo";

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createProject(
  supabase: SupabaseClient,
  tenantId: string,
  data: CreateProjectInput,
): Promise<ApiResponse<Project>> {
  // Check duplicate name
  const exists = await projectNameExists(supabase, tenantId, data.name);
  if (exists) {
    return failure("Ein Projekt mit diesem Namen existiert bereits.");
  }

  const project = await repoCreate(supabase, {
    tenant_id: tenantId,
    name: data.name,
    customer_name: data.customer_name ?? null,
    color: data.color ?? null,
  });

  if (!project) {
    return failure("Projekt konnte nicht erstellt werden.");
  }

  return success(project);
}

export async function updateProject(
  supabase: SupabaseClient,
  tenantId: string,
  projectId: string,
  data: UpdateProjectInput,
): Promise<ApiResponse<Project>> {
  // Check project exists
  const existing = await getProjectById(supabase, tenantId, projectId);
  if (!existing) {
    return failure("Projekt nicht gefunden.");
  }

  // Check duplicate name if renaming
  if (data.name && data.name !== existing.name) {
    const exists = await projectNameExists(supabase, tenantId, data.name, projectId);
    if (exists) {
      return failure("Ein Projekt mit diesem Namen existiert bereits.");
    }
  }

  const updateData: Partial<Pick<Project, "name" | "customer_name" | "color" | "active">> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.customer_name !== undefined) updateData.customer_name = data.customer_name;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.active !== undefined) updateData.active = data.active;

  const updated = await repoUpdate(supabase, tenantId, projectId, updateData);
  if (!updated) {
    return failure("Projekt konnte nicht aktualisiert werden.");
  }

  return success(updated);
}

export async function deactivateProject(
  supabase: SupabaseClient,
  tenantId: string,
  projectId: string,
): Promise<ApiResponse<boolean>> {
  const existing = await getProjectById(supabase, tenantId, projectId);
  if (!existing) {
    return failure("Projekt nicht gefunden.");
  }

  const ok = await softDeleteProject(supabase, tenantId, projectId, getNowIso());
  if (!ok) {
    return failure("Projekt konnte nicht gelöscht werden.");
  }

  return success(true);
}

// ---------------------------------------------------------------------------
// List & detail
// ---------------------------------------------------------------------------

export async function listProjectsWithStats(
  supabase: SupabaseClient,
  tenantId: string,
  includeInactive = false,
  assignedToEmployeeId?: string,
): Promise<ApiResponse<ProjectWithStats[]>> {
  const projects = await repoList(
    supabase,
    tenantId,
    includeInactive,
    assignedToEmployeeId,
  );
  return success(projects);
}

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

export async function assignEmployees(
  supabase: SupabaseClient,
  tenantId: string,
  projectId: string,
  employeeIds: string[],
): Promise<ApiResponse<boolean>> {
  const project = await getProjectById(supabase, tenantId, projectId);
  if (!project) {
    return failure("Projekt nicht gefunden.");
  }

  const existing = await getAssignmentsForProject(supabase, tenantId, projectId);
  const existingIds = new Set(existing.map((a) => a.employee_id));

  for (const empId of employeeIds) {
    if (existingIds.has(empId)) continue;
    await assignEmployeeToProject(supabase, {
      tenant_id: tenantId,
      project_id: projectId,
      employee_id: empId,
    });
  }

  return success(true);
}

export async function unassignEmployee(
  supabase: SupabaseClient,
  tenantId: string,
  projectId: string,
  employeeId: string,
): Promise<ApiResponse<boolean>> {
  const ok = await unassignEmployeeFromProject(supabase, tenantId, projectId, employeeId);
  if (!ok) {
    return failure("Zuordnung konnte nicht entfernt werden.");
  }
  return success(true);
}

/** Replace all assignments for a project with the given employee IDs. */
export async function replaceAssignments(
  supabase: SupabaseClient,
  tenantId: string,
  projectId: string,
  desiredEmployeeIds: string[],
): Promise<ApiResponse<boolean>> {
  const existing = await getAssignmentsForProject(supabase, tenantId, projectId);
  const existingIds = new Set(existing.map((a) => a.employee_id));
  const desiredSet = new Set(desiredEmployeeIds);

  // Add new assignments
  for (const empId of desiredEmployeeIds) {
    if (!existingIds.has(empId)) {
      await assignEmployeeToProject(supabase, {
        tenant_id: tenantId,
        project_id: projectId,
        employee_id: empId,
      });
    }
  }

  // Remove old assignments
  for (const empId of existingIds) {
    if (!desiredSet.has(empId)) {
      await unassignEmployeeFromProject(supabase, tenantId, projectId, empId);
    }
  }

  return success(true);
}

export async function getMyProjects(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
): Promise<ApiResponse<{ id: string; name: string; color: string | null }[]>> {
  const assignments = await getAssignmentsForEmployee(supabase, tenantId, employeeId);
  const projects = assignments.map((a) => ({
    id: a.project.id,
    name: a.project.name,
    color: a.project.color,
  }));
  return success(projects);
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function getProjectReport(
  supabase: SupabaseClient,
  tenantId: string,
  startDate: string,
  endDate: string,
): Promise<ApiResponse<ProjectReportRow[]>> {
  const rows = await getProjectReportRows(supabase, tenantId, startDate, endDate);
  return success(rows);
}

export async function getProjectDetail(
  supabase: SupabaseClient,
  tenantId: string,
  projectId: string,
  startDate: string,
  endDate: string,
): Promise<ApiResponse<ProjectDetailRow[]>> {
  const project = await getProjectById(supabase, tenantId, projectId);
  if (!project) {
    return failure("Projekt nicht gefunden.");
  }

  const rows = await getProjectDetailRows(supabase, tenantId, projectId, startDate, endDate);
  return success(rows);
}
