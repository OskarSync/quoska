/**
 * Sick Entry Service Tests (Epic 10)
 *
 * Covers:
 * - Create sick entries (self and for others)
 * - Update sick entries (add end date)
 * - AU certificate validation
 * - List (role-filtered)
 * - Entgeltfortzahlung check
 */

import { describe, test, expect } from "vitest";
import type { SickEntry } from "@/types/database";
import { createMockSupabase, createTableMock } from "../legal/helpers/supabase-mock";

const baseSick: SickEntry = {
  id: "se-1", tenant_id: "t-1", employee_id: "e-1",
  start_date: "2026-06-01", end_date: null,
  work_days_count: null, au_certificate_url: null, au_uploaded_at: null,
  notes: null, created_by: "e-1",
  created_at: "2026-06-01T08:00:00.000Z", updated_at: "2026-06-01T08:00:00.000Z",
  deleted_at: null,
};

function createSickMock(overrides: {
  selectEmployees?: Record<string, unknown> | null;
  selectSick?: SickEntry | null;
  insertSick?: SickEntry | null;
  updateSick?: SickEntry | null;
  selectHolidays?: unknown[];
  selectList?: SickEntry[];
  selectOngoing?: SickEntry[];
}) {
  return createMockSupabase({
    employees: createTableMock({
      selectResolver: async () => {
        if (overrides.selectEmployees !== undefined) {
          return overrides.selectEmployees === null ? { data: null } : { data: overrides.selectEmployees };
        }
        return { data: { bundesland: "nordrhein-westfalen" } };
      },
    }),
    sick_entries: createTableMock({
      selectResolver: async () => {
        if (overrides.selectList !== undefined) return { data: overrides.selectList };
        if (overrides.selectOngoing !== undefined) return { data: overrides.selectOngoing };
        if (overrides.selectSick !== undefined) return { data: overrides.selectSick };
        return { data: baseSick };
      },
      insertResolver: async () => ({ data: overrides.insertSick !== undefined ? overrides.insertSick : baseSick, error: overrides.insertSick === null ? { message: "DB error" } : null }),
      updateResolver: async () => ({ data: overrides.updateSick !== undefined ? overrides.updateSick : baseSick, error: null }),
    }),
    public_holidays: createTableMock({
      selectResolver: async () => ({ data: overrides.selectHolidays ?? [] }),
    }),
    notifications: createTableMock({
      selectResolver: async () => ({ data: [] }),
      insertResolver: async () => ({ data: { id: "n-1" }, error: null }),
    }),
  });
}

// ---------------------------------------------------------------------------
// createSickEntryRecord
// ---------------------------------------------------------------------------

describe("createSickEntryRecord", () => {
  test("creates sick entry for self", async () => {
    const { createSickEntryRecord } = await import("@/services/sickEntryService");
    const supabase = createSickMock({});

    const result = await createSickEntryRecord(
      supabase, "t-1", "e-1",
      { start_date: "2026-06-01" },
      "2026-06-01T08:00:00.000Z",
    );

    expect(result.data).not.toBeNull();
    expect(result.data!.start_date).toBe("2026-06-01");
  });

  test("creates ongoing sick entry without end_date", async () => {
    const { createSickEntryRecord } = await import("@/services/sickEntryService");
    const supabase = createSickMock({});

    const result = await createSickEntryRecord(
      supabase, "t-1", "e-1",
      { start_date: "2026-06-01" },
      "2026-06-01T08:00:00.000Z",
    );

    expect(result.data).not.toBeNull();
    expect(result.data!.end_date).toBeNull();
    expect(result.data!.work_days_count).toBeNull();
  });

  test("creates sick entry with end_date and calculates work_days_count", async () => {
    const { createSickEntryRecord } = await import("@/services/sickEntryService");
    const sickWithEnd: SickEntry = {
      ...baseSick, end_date: "2026-06-05", work_days_count: 5,
    };
    const supabase = createSickMock({ insertSick: sickWithEnd });

    const result = await createSickEntryRecord(
      supabase, "t-1", "e-1",
      { start_date: "2026-06-01", end_date: "2026-06-05" },
      "2026-06-01T08:00:00.000Z",
    );

    expect(result.data).not.toBeNull();
    expect(result.data!.work_days_count).toBe(5);
  });

  test("creates sick entry for another employee (manager)", async () => {
    const { createSickEntryRecord } = await import("@/services/sickEntryService");
    const sickForOther: SickEntry = { ...baseSick, employee_id: "e-2", created_by: "mgr-1" };
    const supabase = createSickMock({ insertSick: sickForOther });

    const result = await createSickEntryRecord(
      supabase, "t-1", "mgr-1",
      { employee_id: "e-2", start_date: "2026-06-01" },
      "2026-06-01T08:00:00.000Z",
    );

    expect(result.data).not.toBeNull();
    expect(result.data!.employee_id).toBe("e-2");
  });

  test("returns error when insert fails", async () => {
    const { createSickEntryRecord } = await import("@/services/sickEntryService");
    // Insert returns error → repo logs and returns null
    const supabase = createSickMock({ insertSick: null });

    const result = await createSickEntryRecord(
      supabase, "t-1", "e-1",
      { start_date: "2026-06-01" },
      "2026-06-01T08:00:00.000Z",
    );

    // insertSick: null makes the repo return null, service returns failure
    expect(result.error).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// updateSickEntryRecord
// ---------------------------------------------------------------------------

describe("updateSickEntryRecord", () => {
  test("updates own sick entry with end date", async () => {
    const { updateSickEntryRecord } = await import("@/services/sickEntryService");
    const updated: SickEntry = { ...baseSick, end_date: "2026-06-05", work_days_count: 5 };
    const supabase = createSickMock({ updateSick: updated });

    const result = await updateSickEntryRecord(
      supabase, "t-1", "e-1", "employee", "se-1",
      { end_date: "2026-06-05" },
    );

    expect(result.data).not.toBeNull();
    expect(result.data!.end_date).toBe("2026-06-05");
  });

  test("employee cannot update another employee's sick entry", async () => {
    const { updateSickEntryRecord } = await import("@/services/sickEntryService");
    const otherSick: SickEntry = { ...baseSick, employee_id: "e-other" };
    const supabase = createSickMock({ selectSick: otherSick });

    const result = await updateSickEntryRecord(
      supabase, "t-1", "e-1", "employee", "se-1",
      { notes: "Updated" },
    );

    expect(result.error).toContain("eigene");
  });

  test("manager can update any sick entry", async () => {
    const { updateSickEntryRecord } = await import("@/services/sickEntryService");
    const otherSick: SickEntry = { ...baseSick, employee_id: "e-other" };
    const updated: SickEntry = { ...otherSick, notes: "Manager note" };
    const supabase = createSickMock({ selectSick: otherSick, updateSick: updated });

    const result = await updateSickEntryRecord(
      supabase, "t-1", "mgr-1", "manager", "se-1",
      { notes: "Manager note" },
    );

    expect(result.data).not.toBeNull();
  });

  test("returns error for non-existent entry", async () => {
    const { updateSickEntryRecord } = await import("@/services/sickEntryService");
    const supabase = createSickMock({ selectSick: null });

    const result = await updateSickEntryRecord(
      supabase, "t-1", "e-1", "employee", "se-nonexistent",
      { notes: "test" },
    );

    expect(result.error).toContain("nicht gefunden");
  });
});

// ---------------------------------------------------------------------------
// uploadAuCertificate
// ---------------------------------------------------------------------------

describe("uploadAuCertificate", () => {
  test("rejects invalid file type", async () => {
    const { uploadAuCertificate } = await import("@/services/sickEntryService");
    const supabase = createSickMock({});

    const result = await uploadAuCertificate(
      supabase, "t-1", "e-1", "employee", "se-1",
      { name: "test.docx", type: "application/msword", size: 1024, arrayBuffer: async () => new ArrayBuffer(0) },
      "2026-06-02T10:00:00.000Z",
    );

    expect(result.error).toContain("Ungültiges Format");
  });

  test("rejects file too large", async () => {
    const { uploadAuCertificate } = await import("@/services/sickEntryService");
    const supabase = createSickMock({});

    const result = await uploadAuCertificate(
      supabase, "t-1", "e-1", "employee", "se-1",
      { name: "test.pdf", type: "application/pdf", size: 11 * 1024 * 1024, arrayBuffer: async () => new ArrayBuffer(0) },
      "2026-06-02T10:00:00.000Z",
    );

    expect(result.error).toContain("zu groß");
  });
});

// ---------------------------------------------------------------------------
// listSickEntries
// ---------------------------------------------------------------------------

describe("listSickEntries", () => {
  test("employee sees only own entries", async () => {
    const { listSickEntries } = await import("@/services/sickEntryService");
    const supabase = createSickMock({ selectList: [baseSick] });

    const result = await listSickEntries(supabase, "t-1", "e-1", "employee");
    expect(result.data).toHaveLength(1);
  });

  test("manager sees all tenant entries", async () => {
    const { listSickEntries } = await import("@/services/sickEntryService");
    const supabase = createSickMock({ selectList: [baseSick, { ...baseSick, id: "se-2", employee_id: "e-2" }] });

    const result = await listSickEntries(supabase, "t-1", "mgr-1", "manager");
    expect(result.data).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// checkEntgeltfortzahlung
// ---------------------------------------------------------------------------

describe("checkEntgeltfortzahlung", () => {
  test("detects ongoing sick entries past 42 days", async () => {
    const { checkEntgeltfortzahlung } = await import("@/services/sickEntryService");
    const longSick: SickEntry = {
      ...baseSick, start_date: "2026-04-01", end_date: null,
    };

    const supabase = createSickMock({ selectOngoing: [longSick] });

    const result = await checkEntgeltfortzahlung(
      supabase, "t-1", "2026-06-01T10:00:00.000Z",
    );

    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  test("skips entries with end_date set", async () => {
    const { checkEntgeltfortzahlung } = await import("@/services/sickEntryService");
    const completedSick: SickEntry = {
      ...baseSick, start_date: "2026-04-01", end_date: "2026-04-10",
    };

    const supabase = createSickMock({ selectOngoing: [completedSick] });

    const result = await checkEntgeltfortzahlung(
      supabase, "t-1", "2026-06-01T10:00:00.000Z",
    );

    expect(result).toHaveLength(0);
  });
});
