/**
 * Epic 6 Legal Compliance Tests — Export & DSGVO.
 *
 * Tests for:
 * - CSV export data accuracy
 * - Data portability completeness (Art 20 DSGVO)
 * - Retention period (2 years, §16 Abs. 2 ArbZG)
 * - Account deletion waiting period (14 days)
 * - German formatting in all exports
 */

import { describe, test, expect } from "vitest";
import {
  formatDateDE,
  formatTimeDE,
  formatNetHours,
  generateCSV,
  generateDSGVOCSV,
  buildEmployeeExport,
} from "@/services/exportService";
import { calculateCutoffDate } from "@/services/retentionService";
import {
  calculateDeletionDate,
  isDeletionDue,
  isFinalWarningDate,
} from "@/services/accountDeletionService";
import type { ExportRow } from "@/types/export";

// ---------------------------------------------------------------------------
// CSV Export Accuracy (FR-28)
// ---------------------------------------------------------------------------

describe("CSV Export — Data Accuracy (FR-28)", () => {
  test("CSV includes all required columns in German", () => {
    const rows: ExportRow[] = [
      {
        employeeFirstName: "Thomas",
        employeeLastName: "Müller",
        date: "2026-06-03",
        clockIn: "2026-06-03T08:00:00Z",
        clockOut: "2026-06-03T17:00:00Z",
        breakMinutes: 30,
        netMinutes: 510,
        notes: null,
      },
    ];

    const csv = generateCSV(rows);
    const headerLine = csv.split("\n")[0];

    expect(headerLine).toContain("Mitarbeiter");
    expect(headerLine).toContain("Datum");
    expect(headerLine).toContain("Beginn");
    expect(headerLine).toContain("Ende");
    expect(headerLine).toContain("Pause (Min)");
    expect(headerLine).toContain("Netto-Stunden");
    expect(headerLine).toContain("Notizen");
  });

  test("CSV uses DD.MM.YYYY date format", () => {
    const rows: ExportRow[] = [
      {
        employeeFirstName: "A",
        employeeLastName: "B",
        date: "2026-06-03",
        clockIn: "2026-06-03T08:00:00Z",
        clockOut: "2026-06-03T17:00:00Z",
        breakMinutes: 0,
        netMinutes: 540,
        notes: null,
      },
    ];

    const csv = generateCSV(rows);
    expect(csv).toContain("03.06.2026");
    expect(csv).not.toContain("2026-06-03");
  });

  test("CSV uses HH:MM time format", () => {
    const rows: ExportRow[] = [
      {
        employeeFirstName: "A",
        employeeLastName: "B",
        date: "2026-06-03",
        clockIn: "2026-06-03T08:02:00Z",
        clockOut: "2026-06-03T17:04:00Z",
        breakMinutes: 0,
        netMinutes: 542,
        notes: null,
      },
    ];

    const csv = generateCSV(rows);
    expect(csv).toContain("08:02");
    expect(csv).toContain("17:04");
  });

  test("CSV calculates net hours correctly", () => {
    const rows: ExportRow[] = [
      {
        employeeFirstName: "A",
        employeeLastName: "B",
        date: "2026-06-03",
        clockIn: "2026-06-03T08:00:00Z",
        clockOut: "2026-06-03T16:32:00Z",
        breakMinutes: 30,
        netMinutes: 482, // 8h32 - 30min = 482
        notes: null,
      },
    ];

    const csv = generateCSV(rows);
    expect(csv).toContain(formatNetHours(482));
  });

  test("CSV includes all employees when no filter", () => {
    const rows: ExportRow[] = [
      createRow("Max", "M"),
      createRow("Anna", "S"),
      createRow("Tom", "K"),
    ];

    const csv = generateCSV(rows);
    expect(csv).toContain("Max M");
    expect(csv).toContain("Anna S");
    expect(csv).toContain("Tom K");
  });
});


// DSGVO Data Portability (FR-41, Art 20)
// ---------------------------------------------------------------------------

describe("DSGVO Data Portability (FR-41)", () => {
  test("export includes employee profile data", () => {
    const employee = {
      id: "emp-1",
      tenant_id: "tenant-1",
      user_id: "user-1",
      first_name: "Max",
      last_name: "Mustermann",
      email: "max@example.com",
      role: "employee" as const,
      target_hours_week: 40,
      bundesland: "berlin",
      invitation_token: null,
      invited_at: null,
      created_at: "2026-01-15T10:00:00Z",
      updated_at: "2026-01-15T10:00:00Z",
      deleted_at: null,
    };

    const exportData = buildEmployeeExport(employee, [], []);
    const csv = generateDSGVOCSV(exportData);

    expect(csv).toContain("Max");
    expect(csv).toContain("Mustermann");
    expect(csv).toContain("max@example.com");
  });

  test("export includes time entries", () => {
    const employee = {
      id: "emp-1",
      tenant_id: "tenant-1",
      user_id: "user-1",
      first_name: "Max",
      last_name: "M",
      email: "max@example.com",
      role: "employee" as const,
      target_hours_week: 40,
      bundesland: "berlin",
      invitation_token: null,
      invited_at: null,
      created_at: "2026-01-15T10:00:00Z",
      updated_at: "2026-01-15T10:00:00Z",
      deleted_at: null,
    };

    const entries = [
      {
        id: "e-1",
        tenant_id: "tenant-1",
        employee_id: "emp-1",
        date: "2026-06-03",
        clock_in: "2026-06-03T08:00:00Z",
        clock_out: "2026-06-03T17:00:00Z",
        break_minutes: 30,
        status: "completed" as const,
        notes: null,
        created_at: "2026-06-03T08:00:00Z",
        updated_at: "2026-06-03T17:00:00Z",
        deleted_at: null,
        employee_first_name: "Max",
        employee_last_name: "M",
      },
    ];

    const exportData = buildEmployeeExport(employee, entries, []);
    const csv = generateDSGVOCSV(exportData);

    expect(csv).toContain("03.06.2026");
    expect(csv).toContain("08:00");
    expect(csv).toContain("17:00");
  });

  test("export includes audit records", () => {
    const employee = {
      id: "emp-1",
      tenant_id: "tenant-1",
      user_id: "user-1",
      first_name: "Max",
      last_name: "M",
      email: "max@example.com",
      role: "employee" as const,
      target_hours_week: 40,
      bundesland: "berlin",
      invitation_token: null,
      invited_at: null,
      created_at: "2026-01-15T10:00:00Z",
      updated_at: "2026-01-15T10:00:00Z",
      deleted_at: null,
    };

    const auditRecords = [
      {
        id: "audit-1",
        time_entry_id: "e-1",
        tenant_id: "tenant-1",
        changed_by: "mgr-1",
        action: "update" as const,
        field_name: "clock_in",
        old_value: "08:02",
        new_value: "08:00",
        reason: "Uhrenabweichung",
        changed_at: "2026-06-03T18:00:00Z",
      },
    ];

    const exportData = buildEmployeeExport(employee, [], auditRecords);
    const csv = generateDSGVOCSV(exportData);

    expect(csv).toContain("update");
    expect(csv).toContain("clock_in");
    expect(csv).toContain("Uhrenabweichung");
  });

  test("CSV export has correct Art 20 DSGVO header", () => {
    const exportData = {
      employee: {
        firstName: "Max",
        lastName: "M",
        email: "max@example.com",
        role: "employee",
        targetHoursWeek: 40,
        bundesland: "berlin",
        createdAt: "2026-01-15T10:00:00Z",
      },
      timeEntries: [],
      auditRecords: [],
    };

    const csv = generateDSGVOCSV(exportData);
    expect(csv).toContain("Art. 20 DSGVO");
  });
});

// ---------------------------------------------------------------------------
// Data Retention (FR-40, §16 Abs. 2 ArbZG)
// ---------------------------------------------------------------------------

describe("Data Retention (FR-40, §16 Abs. 2 ArbZG)", () => {
  test("retention period is exactly 2 years (730 days)", () => {
    const cutoff = calculateCutoffDate("2026-06-03T12:00:00Z");
    expect(cutoff).toBe("2024-06-03");
  });

  test("entries before cutoff are eligible for soft-delete", () => {
    const cutoff = calculateCutoffDate("2026-06-03T12:00:00Z");
    // An entry from 2024-06-02 should be before cutoff
    expect("2024-06-02" < cutoff).toBe(true);
  });

  test("entries after cutoff are NOT eligible for deletion", () => {
    const cutoff = calculateCutoffDate("2026-06-03T12:00:00Z");
    // An entry from 2024-06-05 should be after cutoff
    expect("2024-06-05" >= cutoff).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Account Deletion (FR-42)
// ---------------------------------------------------------------------------

describe("Account Deletion (FR-42)", () => {
  test("deletion date is 14 days after request", () => {
    const deletionDate = calculateDeletionDate("2026-06-03T12:00:00Z");
    expect(deletionDate).toBe("2026-06-17");
  });

  test("final warning sent 7 days before deletion", () => {
    // Requested on June 3 → deletion on June 17
    // Warning should trigger on June 10 (7 days before)
    const warningDate = isFinalWarningDate(
      "2026-06-17",
      "2026-06-10T12:00:00Z",
    );
    expect(warningDate).toBe(true);

    // Not on June 9
    expect(isFinalWarningDate("2026-06-17", "2026-06-09T12:00:00Z")).toBe(false);
    // Not on June 11
    expect(isFinalWarningDate("2026-06-17", "2026-06-11T12:00:00Z")).toBe(false);
  });

  test("deletion is not due before scheduled date", () => {
    expect(isDeletionDue("2026-06-17", "2026-06-16T12:00:00Z")).toBe(false);
  });

  test("deletion is due on scheduled date", () => {
    expect(isDeletionDue("2026-06-17", "2026-06-17T12:00:00Z")).toBe(true);
  });

  test("deletion is due after scheduled date", () => {
    expect(isDeletionDue("2026-06-17", "2026-06-18T12:00:00Z")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// German Formatting (NFR-6)
// ---------------------------------------------------------------------------

describe("German Formatting in Exports (NFR-6)", () => {
  test("all dates use DD.MM.YYYY format", () => {
    expect(formatDateDE("2026-01-05")).toBe("05.01.2026");
    expect(formatDateDE("2026-12-31")).toBe("31.12.2026");
    expect(formatDateDE("2026-06-03")).toBe("03.06.2026");
  });

  test("all times use HH:MM format", () => {
    expect(formatTimeDE("2026-06-03T08:02:00.000Z")).toBe("08:02");
    expect(formatTimeDE("2026-06-03T17:30:00.000Z")).toBe("17:30");
  });

  test("CSV headers are in German", () => {
    const csv = generateCSV([]);
    const headers = csv.split(",");
    expect(headers).toContain("Mitarbeiter");
    expect(headers).toContain("Datum");
    expect(headers).toContain("Beginn");
    expect(headers).toContain("Ende");
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRow(firstName: string, lastName: string): ExportRow {
  return {
    employeeFirstName: firstName,
    employeeLastName: lastName,
    date: "2026-06-03",
    clockIn: "2026-06-03T08:00:00Z",
    clockOut: "2026-06-03T17:00:00Z",
    breakMinutes: 30,
    netMinutes: 510,
    notes: null,
  };
}
