/**
 * Export types — CSV/PDF export and DSGVO data portability.
 */

import { z } from "zod";

/** Input for manager CSV/PDF export. */
export const exportQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  employeeId: z.string().uuid().optional(),
});

export type ExportQueryInput = z.infer<typeof exportQuerySchema>;

/** A single row in the CSV export (time entry with employee name). */
export interface ExportRow {
  employeeFirstName: string;
  employeeLastName: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  netMinutes: number;
  notes: string | null;
}

/** Full employee data for DSGVO Art 20 portability export. */
export interface EmployeeFullExport {
  employee: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    targetHoursWeek: number;
    bundesland: string | null;
    createdAt: string;
  };
  timeEntries: ExportRow[];
  auditRecords: AuditExportRow[];
}

/** Audit record for DSGVO export. */
export interface AuditExportRow {
  timeEntryId: string;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  changedAt: string;
}

/** Account deletion request input. */
export const accountDeletionSchema = z.object({
  password: z.string().min(1, "Passwort ist erforderlich"),
});

export type AccountDeletionInput = z.infer<typeof accountDeletionSchema>;
