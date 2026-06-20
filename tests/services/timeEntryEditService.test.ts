/**
 * Time Entry Edit Service Tests
 *
 * Tests manager time entry editing with audit trail (Story 4.1).
 * Covers:
 * - Mandatory reason enforcement (min 5 chars)
 * - Only editable fields can be changed
 * - Audit records created for each changed field
 * - No audit records for unchanged fields
 * - Error handling for non-existent entries
 */

import { describe, test, expect, vi } from "vitest";
import type { TimeEntry } from "@/types/database";
import { createMockSupabase, createTableMock, createChain } from "../legal/helpers/supabase-mock";

const baseEntry: TimeEntry = {
  id: "te-1",
  tenant_id: "t-1",
  employee_id: "e-1",
  date: "2026-06-02",
  clock_in: "2026-06-02T08:02:00.000Z",
  clock_out: "2026-06-02T17:00:00.000Z",
  break_minutes: 30,
  status: "completed",
  notes: null,
  created_at: "",
  updated_at: "",
  deleted_at: null,
};

function createEditMock(overrides: {
  selectEntry?: TimeEntry | null;
  updateEntry?: TimeEntry;
}) {
  const auditInserts: unknown[] = [];
  const captureAudit = vi.fn().mockImplementation((data: unknown) => {
    auditInserts.push(data);
    return createChain(async () => ({ data: null, error: null }));
  });

  const supabase = createMockSupabase({
    time_entries: createTableMock({
      selectResolver: async () => ({
        data: overrides.selectEntry !== undefined ? overrides.selectEntry : baseEntry,
      }),
      updateResolver: async () => ({
        data: overrides.updateEntry ?? baseEntry,
        error: null,
      }),
    }),
    time_entry_audit: { insert: captureAudit },
  });

  return { supabase, auditInserts };
}

describe("editTimeEntry", () => {
  test("rejects edit without reason", async () => {
    const { editTimeEntry } = await import("@/services/timeEntryEditService");
    const { supabase } = createEditMock({});
    const result = await editTimeEntry(supabase, "t-1", "mgr-1", "te-1", { clock_in: "2026-06-02T08:00:00.000Z" }, "");
    expect(result.error).toContain("mindestens 5 Zeichen");
    expect(result.data).toBeNull();
  });

  test("rejects edit with reason shorter than 5 characters", async () => {
    const { editTimeEntry } = await import("@/services/timeEntryEditService");
    const { supabase } = createEditMock({});
    const result = await editTimeEntry(supabase, "t-1", "mgr-1", "te-1", { clock_in: "2026-06-02T08:00:00.000Z" }, "Test");
    expect(result.error).toContain("mindestens 5 Zeichen");
  });

  test("rejects edit of non-editable fields", async () => {
    const { editTimeEntry } = await import("@/services/timeEntryEditService");
    const { supabase } = createEditMock({});
    const result = await editTimeEntry(
      supabase, "t-1", "mgr-1", "te-1",
      { status: "running" } as Record<string, unknown>,
      "Valid reason",
    );
    expect(result.error).toContain("nicht bearbeitet werden");
  });

  test("returns entry unchanged when no fields actually changed", async () => {
    const { editTimeEntry } = await import("@/services/timeEntryEditService");
    const { supabase, auditInserts } = createEditMock({});
    const result = await editTimeEntry(
      supabase, "t-1", "mgr-1", "te-1",
      { clock_in: "2026-06-02T08:02:00.000Z" }, // same as baseEntry
      "Valid reason",
    );
    expect(result.data).not.toBeNull();
    expect(auditInserts).toHaveLength(0);
  });

  test("creates audit record for changed clock_in field", async () => {
    const { editTimeEntry } = await import("@/services/timeEntryEditService");
    const updatedEntry = { ...baseEntry, clock_in: "2026-06-02T08:00:00.000Z" };
    const { supabase, auditInserts } = createEditMock({ updateEntry: updatedEntry });
    const result = await editTimeEntry(
      supabase, "t-1", "mgr-1", "te-1",
      { clock_in: "2026-06-02T08:00:00.000Z" },
      "Uhrenabweichung korrigiert",
    );
    expect(result.data).not.toBeNull();
    expect(auditInserts).toHaveLength(1);
    expect(auditInserts[0]).toMatchObject({
      action: "update",
      field_name: "clock_in",
      old_value: "2026-06-02T08:02:00.000Z",
      new_value: "2026-06-02T08:00:00.000Z",
      reason: "Uhrenabweichung korrigiert",
      changed_by: "mgr-1",
    });
  });

  test("creates audit records for multiple changed fields", async () => {
    const { editTimeEntry } = await import("@/services/timeEntryEditService");
    const updatedEntry = { ...baseEntry, clock_in: "2026-06-02T08:00:00.000Z", break_minutes: 45 };
    const { supabase, auditInserts } = createEditMock({ updateEntry: updatedEntry });
    await editTimeEntry(
      supabase, "t-1", "mgr-1", "te-1",
      { clock_in: "2026-06-02T08:00:00.000Z", break_minutes: 45 },
      "Pausenzeit nachgetragen",
    );
    expect(auditInserts).toHaveLength(2);
    const fields = auditInserts.map((a: unknown) => (a as { field_name: string }).field_name);
    expect(fields).toContain("clock_in");
    expect(fields).toContain("break_minutes");
  });

  test("returns error when time entry not found", async () => {
    const { editTimeEntry } = await import("@/services/timeEntryEditService");
    const { supabase } = createEditMock({ selectEntry: null });
    const result = await editTimeEntry(
      supabase, "t-1", "mgr-1", "te-1",
      { clock_in: "2026-06-02T08:00:00.000Z" },
      "Valid reason",
    );
    expect(result.error).toContain("nicht gefunden");
  });

  test("returns error when DB update fails", async () => {
    const { editTimeEntry } = await import("@/services/timeEntryEditService");
    const supabase = createMockSupabase({
      time_entries: createTableMock({
        selectResolver: async () => ({ data: baseEntry }),
        updateResolver: async () => ({ data: null, error: { message: "DB error" } }),
      }),
      time_entry_audit: { insert: vi.fn().mockReturnValue(createChain(async () => ({ data: null, error: null }))) },
    });
    const result = await editTimeEntry(
      supabase, "t-1", "mgr-1", "te-1",
      { clock_in: "2026-06-02T08:00:00.000Z" },
      "Valid reason",
    );
    expect(result.error).toContain("fehlgeschlagen");
  });
});

describe("getTimeEntryAuditTrail", () => {
  test("returns audit records for existing entry", async () => {
    const { getTimeEntryAuditTrail } = await import("@/services/timeEntryEditService");
    const auditRecords = [
      { id: "a1", action: "create" as const, field_name: "clock_in" },
      { id: "a2", action: "update" as const, field_name: "clock_out" },
    ];
    const supabase = createMockSupabase({
      time_entries: createTableMock({ selectResolver: async () => ({ data: baseEntry }) }),
      time_entry_audit: createTableMock({ selectResolver: async () => ({ data: auditRecords }) }),
    });
    const result = await getTimeEntryAuditTrail(supabase, "t-1", "te-1");
    expect(result.data).toHaveLength(2);
  });

  test("returns error for non-existent entry", async () => {
    const { getTimeEntryAuditTrail } = await import("@/services/timeEntryEditService");
    const supabase = createMockSupabase({
      time_entries: createTableMock({ selectResolver: async () => ({ data: null }) }),
    });
    const result = await getTimeEntryAuditTrail(supabase, "t-1", "te-nonexistent");
    expect(result.error).toContain("nicht gefunden");
  });
});
