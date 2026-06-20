/**
 * Export Service — Pure functions for CSV generation.
 *
 * Handles CSV formatting for manager reports and DSGVO
 * Art 20 data portability exports.
 *
 * This file is in the Services layer. It imports from Types.
 */

import type {
  ExportRow,
  EmployeeFullExport,
  AuditExportRow,
} from "@/types/export";
import type {
  TimeEntry,
  TimeEntryAudit,
  Employee,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Date/time formatting (German)
// ---------------------------------------------------------------------------

/** Format ISO date string to DD.MM.YYYY. */
export function formatDateDE(iso: string): string {
  const parts = iso.slice(0, 10).split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

/** Format ISO timestamp to HH:MM. */
export function formatTimeDE(iso: string): string {
  // ISO timestamp: "2026-06-03T08:02:00.000Z" → "08:02" (German TZ)
  const match = iso.match(/T(\d{2}):(\d{2})/);
  if (!match) return iso;
  // Simple UTC→German (CET/CEST approx +1/+2)
  // For CSV export, we show the stored time directly
  return `${match[1]}:${match[2]}`;
}

/** Format minutes as "H:MM" hours. */
export function formatNetHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// CSV escaping
// ---------------------------------------------------------------------------

/** Escape a CSV field (quote if contains comma, quote, or newline). */
export function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ---------------------------------------------------------------------------
// Manager CSV Export
// ---------------------------------------------------------------------------

/**
 * Convert raw time entries with employee names to export rows.
 * Calculates net minutes from clock_in/clock_out and break_minutes.
 */
export function entriesToExportRows(
  entries: (TimeEntry & {
    employee_first_name: string;
    employee_last_name: string;
  })[],
): ExportRow[] {
  return entries.map((entry) => {
    const grossMinutes = entry.clock_out
      ? Math.round(
          Math.abs(
            Date.parse(entry.clock_out) - Date.parse(entry.clock_in),
          ) / 60_000,
        )
      : 0;
    const netMinutes = grossMinutes - entry.break_minutes;

    return {
      employeeFirstName: entry.employee_first_name,
      employeeLastName: entry.employee_last_name,
      date: entry.date,
      clockIn: entry.clock_in,
      clockOut: entry.clock_out,
      breakMinutes: entry.break_minutes,
      netMinutes,
      notes: entry.notes,
    };
  });
}

/**
 * Generate CSV content for manager export.
 * German headers, DD.MM.YYYY dates, HH:MM times.
 */
export function generateCSV(exportRows: ExportRow[]): string {
  const headers = [
    "Mitarbeiter",
    "Datum",
    "Beginn",
    "Ende",
    "Pause (Min)",
    "Netto-Stunden",
    "Notizen",
  ];

  const headerLine = headers.join(",");

  const dataLines = exportRows.map((row) => {
    const name = `${row.employeeFirstName} ${row.employeeLastName}`;
    return [
      escapeCSV(name),
      formatDateDE(row.date),
      formatTimeDE(row.clockIn),
      row.clockOut ? formatTimeDE(row.clockOut) : "–",
      String(row.breakMinutes),
      formatNetHours(row.netMinutes),
      escapeCSV(row.notes),
    ].join(",");
  });

  return [headerLine, ...dataLines].join("\n");
}

/**
 * Generate CSV filename for a date range.
 */
export function csvFilename(startDate: string, endDate: string): string {
  return `quoska_${startDate}_bis_${endDate}.csv`;
}

// ---------------------------------------------------------------------------
// DSGVO Data Portability (Art 20)
// ---------------------------------------------------------------------------

/**
 * Build a full employee data export for DSGVO portability.
 * Includes profile, all time entries (even soft-deleted), and audit records.
 */
export function buildEmployeeExport(
  employee: Employee,
  allEntries: (TimeEntry & {
    employee_first_name?: string;
    employee_last_name?: string;
  })[],
  auditRecords: TimeEntryAudit[],
): EmployeeFullExport {
  const exportEntries: ExportRow[] = allEntries.map((entry) => {
    const grossMinutes = entry.clock_out
      ? Math.round(
          Math.abs(
            Date.parse(entry.clock_out) - Date.parse(entry.clock_in),
          ) / 60_000,
        )
      : 0;
    const netMinutes = grossMinutes - entry.break_minutes;

    return {
      employeeFirstName: entry.employee_first_name ?? employee.first_name,
      employeeLastName: entry.employee_last_name ?? employee.last_name,
      date: entry.date,
      clockIn: entry.clock_in,
      clockOut: entry.clock_out,
      breakMinutes: entry.break_minutes,
      netMinutes,
      notes: entry.notes,
    };
  });

  const auditExportRows: AuditExportRow[] = auditRecords.map((r) => ({
    timeEntryId: r.time_entry_id,
    action: r.action,
    fieldName: r.field_name,
    oldValue: r.old_value,
    newValue: r.new_value,
    reason: r.reason,
    changedAt: r.changed_at,
  }));

  return {
    employee: {
      firstName: employee.first_name,
      lastName: employee.last_name,
      email: employee.email,
      role: employee.role,
      targetHoursWeek: employee.target_hours_week,
      bundesland: employee.bundesland,
      createdAt: employee.created_at,
    },
    timeEntries: exportEntries,
    auditRecords: auditExportRows,
  };
}

/**
 * Generate CSV content for DSGVO employee data portability.
 */
export function generateDSGVOCSV(exportData: EmployeeFullExport): string {
  const lines: string[] = [];

  // Employee profile section
  lines.push("# Mitarbeiterdaten (Art. 20 DSGVO)");
  lines.push(`Vorname,${escapeCSV(exportData.employee.firstName)}`);
  lines.push(`Nachname,${escapeCSV(exportData.employee.lastName)}`);
  lines.push(`E-Mail,${escapeCSV(exportData.employee.email)}`);
  lines.push(`Rolle,${exportData.employee.role}`);
  lines.push(`Wochenstunden,${exportData.employee.targetHoursWeek}`);
  lines.push(
    `Bundesland,${exportData.employee.bundesland ?? "Nicht angegeben"}`,
  );
  lines.push(`Erstellt am,${formatDateDE(exportData.employee.createdAt)}`);
  lines.push("");

  // Time entries section
  lines.push("# Zeiteinträge");
  const entryHeaders = [
    "Datum",
    "Beginn",
    "Ende",
    "Pause (Min)",
    "Netto-Stunden",
    "Notizen",
  ];
  lines.push(entryHeaders.join(","));

  for (const entry of exportData.timeEntries) {
    lines.push(
      [
        formatDateDE(entry.date),
        formatTimeDE(entry.clockIn),
        entry.clockOut ? formatTimeDE(entry.clockOut) : "–",
        String(entry.breakMinutes),
        formatNetHours(entry.netMinutes),
        escapeCSV(entry.notes),
      ].join(","),
    );
  }
  lines.push("");

  // Audit records section
  lines.push("# Änderungsverlauf");
  const auditHeaders = [
    "Zeitpunkt",
    "Aktion",
    "Feld",
    "Alter Wert",
    "Neuer Wert",
    "Grund",
  ];
  lines.push(auditHeaders.join(","));

  for (const audit of exportData.auditRecords) {
    lines.push(
      [
        formatDateDE(audit.changedAt),
        audit.action,
        audit.fieldName ?? "",
        escapeCSV(audit.oldValue),
        escapeCSV(audit.newValue),
        escapeCSV(audit.reason),
      ].join(","),
    );
  }

  return lines.join("\n");
}
