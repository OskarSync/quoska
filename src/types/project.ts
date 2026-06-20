/**
 * Project types — Zod schemas and input types for Epic 11.
 */

import { z } from "zod";

export const PROJECT_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#ef4444", "#f97316",
  "#eab308", "#84cc16", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#2563eb", "#7c3aed",
] as const;

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(100),
  customer_name: z.string().max(200).nullable().optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Ungültige Farbe").optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(100).optional(),
  customer_name: z.string().max(200).nullable().optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Ungültige Farbe").optional(),
  active: z.boolean().optional(),
});

export const assignEmployeesSchema = z.object({
  employee_ids: z.array(z.string().uuid()).min(1, "Mindestens ein Mitarbeiter"),
});

export const projectReportQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export interface ProjectWithStats {
  id: string;
  tenant_id: string;
  name: string;
  customer_name: string | null;
  color: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  employee_count: number;
}

export interface ProjectReportRow {
  project_id: string | null;
  project_name: string;
  customer_name: string | null;
  total_minutes: number;
  entry_count: number;
  employee_count: number;
}

export interface ProjectDetailRow {
  employee_id: string;
  employee_name: string;
  total_minutes: number;
  entry_count: number;
}

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AssignEmployeesInput = z.infer<typeof assignEmployeesSchema>;
export type ProjectReportQuery = z.infer<typeof projectReportQuerySchema>;
