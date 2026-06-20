/**
 * Unit tests for exportService — CSV generation, formatting, DSGVO export.
 */

import { describe, test, expect } from "vitest";
import {
  formatDateDE,
  formatTimeDE,
  formatNetHours,
  escapeCSV,
  entriesToExportRows,
  generateCSV,
  csvFilename,
  buildEmployeeExport,
  generateDSGVOCSV,
} from "@/services/exportService";
import type { TimeEntry } from "@/types/database";

// ---------------------------------------------------------------------------
// Date/time formatting
// ---------------------------------------------------------------------------

describe("formatDateDE", () => {
  test("formats ISO date to DD.MM.YYYY", () => {
    expect(formatDateDE("2026-06-03")).toBe("03.06.2026");
  });

  test("handles January 1st", () => {
    expect(formatDateDE("2026-01-01")).toBe("01.01.2026");
  });

  test("handles December 31st", () => {
    expect(formatDateDE("2026-12-31")).toBe("31.12.2026");
  });
});

describe("formatTimeDE", () => {
  test("extracts HH:MM from ISO timestamp", () => {
    expect(formatTimeDE("2026-06-03T08:02:00.000Z")).toBe("08:02");
  });

  test("handles midnight", () => {
    expect(formatTimeDE("2026-06-03T00:00:00.000Z")).toBe("00:00");
  });

  test("handles end of day", () => {
    expect(formatTimeDE("2026-06-03T23:59:00.000Z")).toBe("23:59");
  });
});

describe("formatNetHours", () => {
  test("formats 0 minutes", () => {
    expect(formatNetHours(0)).toBe("0:00");
  });

  test("formats 60 minutes as 1:00", () => {
    expect(formatNetHours(60)).toBe("1:00");
  });

  test("formats 512 minutes as 8:32", () => {
    expect(formatNetHours(512)).toBe("8:32");
  });

  test("formats 5 minutes as 0:05", () => {
    expect(formatNetHours(5)).toBe("0:05");
  });
});

// ---------------------------------------------------------------------------
// CSV escaping
// ---------------------------------------------------------------------------

describe("escapeCSV", () => {
  test("returns empty string for null", () => {
    expect(escapeCSV(null)).toBe("");
  });

  test("returns empty string for undefined", () => {
    expect(escapeCSV(undefined)).toBe("");
  });

  test("returns plain text unchanged", () => {
    expect(escapeCSV("hello")).toBe("hello");
  });

  test("escapes comma", () => {
    expect(escapeCSV("hello, world")).toBe('"hello, world"');
  });

  test("escapes quotes", () => {
    expect(escapeCSV('say "hi"')).toBe('"say ""hi"""');
  });

  test("escapes newline", () => {
    expect(escapeCSV("line1\nline2")).toBe('"line1\nline2"');
  });
});

// ---------------------------------------------------------------------------
// entriesToExportRows
// ---------------------------------------------------------------------------

describe("entriesToExportRows", () => {
  test("converts time entries to export rows", () => {
    const entries = [
      {
        ...createMockEntry("2026-06-03", "2026-06-03T08:00:00Z", "2026-06-03T17:00:00Z"),
        employee_first_name: "Max",
        employee_last_name: "Mustermann",
        break_minutes: 30,
      },
    ];

    const rows = entriesToExportRows(entries);

    expect(rows).toHaveLength(1);
    expect(rows[0].employeeFirstName).toBe("Max");
    expect(rows[0].employeeLastName).toBe("Mustermann");
    expect(rows[0].date).toBe("2026-06-03");
    expect(rows[0].netMinutes).toBe(510); // 9h - 30min = 510
    expect(rows[0].breakMinutes).toBe(30);
  });

  test("handles entry without clock_out", () => {
    const entries = [
      {
        ...createMockEntry("2026-06-03", "2026-06-03T08:00:00Z", null),
        employee_first_name: "Anna",
        employee_last_name: "Schmidt",
        break_minutes: 0,
        status: "running" as const,
      },
    ];

    const rows = entriesToExportRows(entries);
    expect(rows[0].netMinutes).toBe(0);
    expect(rows[0].clockOut).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// generateCSV
// ---------------------------------------------------------------------------

describe("generateCSV", () => {
  test("generates CSV with German headers", () => {
    const rows = [
      {
        employeeFirstName: "Max",
        employeeLastName: "Mustermann",
        date: "2026-06-03",
        clockIn: "2026-06-03T08:00:00Z",
        clockOut: "2026-06-03T17:00:00Z",
        breakMinutes: 30,
        netMinutes: 510,
        notes: null,
      },
    ];

    const csv = generateCSV(rows);
    const lines = csv.split("\n");

    expect(lines[0]).toBe("Mitarbeiter,Datum,Beginn,Ende,Pause (Min),Netto-Stunden,Notizen");
    expect(lines[1]).toContain("Max Mustermann");
    expect(lines[1]).toContain("03.06.2026");
    expect(lines[1]).toContain("08:00");
    expect(lines[1]).toContain("17:00");
  });

  test("handles empty rows", () => {
    const csv = generateCSV([]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(1); // Header only
  });

  test("escapes notes with commas", () => {
    const rows = [
      {
        employeeFirstName: "Max",
        employeeLastName: "M",
        date: "2026-06-03",
        clockIn: "2026-06-03T08:00:00Z",
        clockOut: "2026-06-03T17:00:00Z",
        breakMinutes: 0,
        netMinutes: 540,
        notes: "Kunde A, Projekt B",
      },
    ];

    const csv = generateCSV(rows);
    expect(csv).toContain('"Kunde A, Projekt B"');
  });
});

describe("csvFilename", () => {
  test("generates correct filename", () => {
    expect(csvFilename("2026-06-01", "2026-06-07")).toBe(
      "quoska_2026-06-01_bis_2026-06-07.csv",
    );
  });
});

// ---------------------------------------------------------------------------
// DSGVO Data Portability
// ---------------------------------------------------------------------------

describe("buildEmployeeExport", () => {
  test("builds complete export from employee data", () => {
    const employee = createMockEmployee();
    const entries = [
      {
        ...createMockEntry("2026-06-03", "2026-06-03T08:00:00Z", "2026-06-03T17:00:00Z"),
        employee_first_name: "Max",
        employee_last_name: "Mustermann",
        break_minutes: 30,
      },
    ];
    const auditRecords = [
      {
        id: "audit-1",
        time_entry_id: "entry-1",
        tenant_id: "tenant-1",
        changed_by: null,
        action: "create" as const,
        field_name: null,
        old_value: null,
        new_value: null,
        reason: null,
        changed_at: "2026-06-03T08:00:00Z",
      },
    ];

    const exportData = buildEmployeeExport(employee, entries, auditRecords);

    expect(exportData.employee.firstName).toBe("Max");
    expect(exportData.employee.email).toBe("max@example.com");
    expect(exportData.timeEntries).toHaveLength(1);
    expect(exportData.auditRecords).toHaveLength(1);
    expect(exportData.auditRecords[0].action).toBe("create");
  });
});

describe("generateDSGVOCSV", () => {
  test("includes all sections", () => {
    const exportData = {
      employee: {
        firstName: "Max",
        lastName: "Mustermann",
        email: "max@example.com",
        role: "employee",
        targetHoursWeek: 40,
        bundesland: "berlin",
        createdAt: "2026-01-15T10:00:00Z",
      },
      timeEntries: [
        {
          employeeFirstName: "Max",
          employeeLastName: "Mustermann",
          date: "2026-06-03",
          clockIn: "2026-06-03T08:00:00Z",
          clockOut: "2026-06-03T17:00:00Z",
          breakMinutes: 30,
          netMinutes: 510,
          notes: null,
        },
      ],
      auditRecords: [],
    };

    const csv = generateDSGVOCSV(exportData);

    expect(csv).toContain("# Mitarbeiterdaten (Art. 20 DSGVO)");
    expect(csv).toContain("Max");
    expect(csv).toContain("# Zeiteinträge");
    expect(csv).toContain("# Änderungsverlauf");
    expect(csv).toContain("03.06.2026");
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockEntry(
  date: string,
  clockIn: string,
  clockOut: string | null,
): TimeEntry {
  return {
    id: "entry-1",
    tenant_id: "tenant-1",
    employee_id: "emp-1",
    date,
    clock_in: clockIn,
    clock_out: clockOut,
    break_minutes: 0,
    status: "completed",
    notes: null,
    created_at: clockIn,
    updated_at: clockIn,
    deleted_at: null,
  };
}

function createMockEmployee() {
  return {
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
}
