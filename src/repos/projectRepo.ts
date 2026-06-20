/**
 * Project Repo — Database queries for projects and project_assignments.
 *
 * This file is in the Repos layer. It can import from Types and Config only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project, ProjectAssignment } from "@/types/database";
import type { ProjectWithStats, ProjectReportRow, ProjectDetailRow } from "@/types/project";

// Projects CRUD

/** Create a project. Returns the inserted row or null on error. */
export async function createProject(
  supabase: SupabaseClient,
  data: {
    tenant_id: string;
    name: string;
    customer_name?: string | null;
    color?: string | null;
  },
): Promise<Project | null> {
  const { data: inserted, error } = await supabase
    .from("projects")
    .insert(data)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create project:", error);
    return null;
  }
  return inserted;
}

/** Get a project by ID, scoped to tenant. */
export async function getProjectById(
  supabase: SupabaseClient,
  tenantId: string,
  projectId: string,
): Promise<Project | null> {
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .single();
  return data;
}

/** List all projects for a tenant with assignment counts. */
export async function listProjects(
  supabase: SupabaseClient,
  tenantId: string,
  includeInactive = false,
  assignedToEmployeeId?: string,
): Promise<ProjectWithStats[]> {
  // If filtering by employee, use project_assignments join
  if (assignedToEmployeeId) {
    const { data: assignments } = await supabase
      .from("project_assignments")
      .select("project_id, projects(*)")
      .eq("tenant_id", tenantId)
      .eq("employee_id", assignedToEmployeeId);
    if (!assignments) return [];
    return assignments
      .filter((a) => {
        const p = a.projects as unknown as Project | null;
        if (!p || p.deleted_at) return false;
        return includeInactive || p.active;
      })
      .map((a) => {
        const p = a.projects as unknown as Project;
        return {
          id: p.id, tenant_id: p.tenant_id, name: p.name,
          customer_name: p.customer_name, color: p.color, active: p.active,
          created_at: p.created_at, updated_at: p.updated_at, deleted_at: p.deleted_at,
          employee_count: 0,
        };
      });
  }

  let query = supabase
    .from("projects")
    .select("*, project_assignments(count)")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);
  if (!includeInactive) query = query.eq("active", true);
  const { data } = await query.order("name", { ascending: true });
  if (!data) return [];
  return data.map((p) => ({
    id: p.id, tenant_id: p.tenant_id, name: p.name,
    customer_name: p.customer_name, color: p.color, active: p.active,
    created_at: p.created_at, updated_at: p.updated_at, deleted_at: p.deleted_at,
    employee_count: (p.project_assignments as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));
}

/** Update a project. Returns updated row or null on error. */
export async function updateProject(
  supabase: SupabaseClient,
  tenantId: string,
  projectId: string,
  data: Partial<Pick<Project, "name" | "customer_name" | "color" | "active">>,
): Promise<Project | null> {
  const { data: updated, error } = await supabase
    .from("projects")
    .update(data)
    .eq("id", projectId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to update project:", error);
    return null;
  }
  return updated;
}

/** Soft-delete (deactivate) a project. */
export async function softDeleteProject(
  supabase: SupabaseClient,
  tenantId: string,
  projectId: string,
  nowIso: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("projects")
    .update({ deleted_at: nowIso })
    .eq("id", projectId)
    .eq("tenant_id", tenantId);
  return !error;
}

/** Check for duplicate project name within tenant. */
export async function projectNameExists(
  supabase: SupabaseClient,
  tenantId: string,
  name: string,
  excludeId?: string,
): Promise<boolean> {
  let query = supabase
    .from("projects")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", name)
    .is("deleted_at", null);
  if (excludeId) query = query.neq("id", excludeId);

  const { data } = await query.limit(1);
  return (data?.length ?? 0) > 0;
}

// Assignments

/** Assign an employee to a project. Returns the assignment or null. */
export async function assignEmployeeToProject(
  supabase: SupabaseClient,
  data: { tenant_id: string; project_id: string; employee_id: string },
): Promise<ProjectAssignment | null> {
  const { data: inserted, error } = await supabase
    .from("project_assignments")
    .insert(data)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to assign employee:", error);
    return null;
  }
  return inserted;
}

/** Unassign an employee from a project. */
export async function unassignEmployeeFromProject(
  supabase: SupabaseClient,
  tenantId: string,
  projectId: string,
  employeeId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("project_assignments")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("project_id", projectId)
    .eq("employee_id", employeeId);
  return !error;
}

/** Get all project assignments for an employee (active projects only). */
export async function getAssignmentsForEmployee(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
): Promise<(ProjectAssignment & { project: Project })[]> {
  const { data } = await supabase
    .from("project_assignments")
    .select("*, project:projects!project_id(*)")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .eq("project.active", true);
  return (data as unknown as (ProjectAssignment & { project: Project })[]) ?? [];
}

/** Get all assignments for a project. */
export async function getAssignmentsForProject(
  supabase: SupabaseClient,
  tenantId: string,
  projectId: string,
): Promise<(ProjectAssignment & { employee: { id: string; first_name: string; last_name: string } })[]> {
  const { data } = await supabase
    .from("project_assignments")
    .select("*, employee:employees!employee_id(id, first_name, last_name)")
    .eq("tenant_id", tenantId)
    .eq("project_id", projectId);
  return (data as unknown as (ProjectAssignment & { employee: { id: string; first_name: string; last_name: string } })[]) ?? [];
}

// Reports

/** Get aggregated project hours for reports. */
export async function getProjectReportRows(
  supabase: SupabaseClient,
  tenantId: string,
  startDate: string,
  endDate: string,
): Promise<ProjectReportRow[]> {
  // Fetch time entries with project info in date range
  const { data: entries } = await supabase
    .from("time_entries")
    .select("project_id, employee_id, clock_in, clock_out, break_minutes, status")
    .eq("tenant_id", tenantId)
    .gte("date", startDate)
    .lte("date", endDate)
    .is("deleted_at", null);

  if (!entries || entries.length === 0) return [];
  const projectIds = [...new Set(entries.map((e) => e.project_id).filter(Boolean))] as string[];
  const { data: projects } = await supabase.from("projects").select("id, name, customer_name").in("id", projectIds);
  const projectMap = new Map((projects ?? []).map((p) => [p.id, p]));

  const agg = new Map<string, { minutes: number; entries: number; employees: Set<string> }>();
  for (const entry of entries) {
    const key = entry.project_id ?? "__none__";
    const existing = agg.get(key) ?? { minutes: 0, entries: 0, employees: new Set<string>() };
    if (entry.status === "completed" && entry.clock_out) {
      const totalMin = (Date.parse(entry.clock_out) - Date.parse(entry.clock_in)) / 60_000;
      existing.minutes += Math.max(0, totalMin - (entry.break_minutes ?? 0));
    }
    existing.entries += 1;
    existing.employees.add(entry.employee_id);
    agg.set(key, existing);
  }
  const result: ProjectReportRow[] = [];
  for (const [key, val] of agg) {
    if (key === "__none__") {
      result.push({ project_id: null, project_name: "Ohne Projekt", customer_name: null, total_minutes: Math.round(val.minutes), entry_count: val.entries, employee_count: val.employees.size });
    } else {
      const proj = projectMap.get(key);
      result.push({ project_id: key, project_name: proj?.name ?? "Unbekannt", customer_name: proj?.customer_name ?? null, total_minutes: Math.round(val.minutes), entry_count: val.entries, employee_count: val.employees.size });
    }
  }
  return result.sort((a, b) => b.total_minutes - a.total_minutes);
}

/** Get per-employee breakdown for a specific project. */
export async function getProjectDetailRows(
  supabase: SupabaseClient,
  tenantId: string,
  projectId: string,
  startDate: string,
  endDate: string,
): Promise<ProjectDetailRow[]> {
  const { data: entries } = await supabase
    .from("time_entries")
    .select("employee_id, clock_in, clock_out, break_minutes, status")
    .eq("tenant_id", tenantId)
    .eq("project_id", projectId)
    .gte("date", startDate)
    .lte("date", endDate)
    .is("deleted_at", null);

  if (!entries || entries.length === 0) return [];

  const employeeIds = [...new Set(entries.map((e) => e.employee_id))];
  const { data: employees } = await supabase
    .from("employees")
    .select("id, first_name, last_name")
    .in("id", employeeIds);

  const empMap = new Map((employees ?? []).map((e) => [e.id, e]));

  const agg = new Map<string, { minutes: number; entries: number }>();
  for (const entry of entries) {
    const existing = agg.get(entry.employee_id) ?? { minutes: 0, entries: 0 };
    if (entry.status === "completed" && entry.clock_out) {
      const totalMin = (Date.parse(entry.clock_out) - Date.parse(entry.clock_in)) / 60_000;
      existing.minutes += Math.max(0, totalMin - (entry.break_minutes ?? 0));
    }
    existing.entries += 1;
    agg.set(entry.employee_id, existing);
  }

  const result: ProjectDetailRow[] = [];
  for (const [empId, val] of agg) {
    const emp = empMap.get(empId);
    result.push({
      employee_id: empId,
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : "Unbekannt",
      total_minutes: Math.round(val.minutes),
      entry_count: val.entries,
    });
  }

  return result.sort((a, b) => b.total_minutes - a.total_minutes);
}
