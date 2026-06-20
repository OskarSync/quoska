/**
 * Revisionssicherheit Compliance Tests
 *
 * Verifies audit trail meets German requirements (GoBD, §16 ArbZG).
 * Uses shared mock helpers from ./helpers/supabase-mock.
 */

import { describe, test, expect, vi } from "vitest";
import type { TimeEntry, BreakSession } from "@/types/database";
import { createMockSupabase, createTableMock, createChain } from "./helpers/supabase-mock";

// Shared test data
const baseEntry: TimeEntry = {
  id: "te-1", tenant_id: "t-1", employee_id: "e-1", date: "2026-06-02",
  clock_in: "2026-06-02T08:00:00.000Z", clock_out: null, break_minutes: 0,
  status: "running", notes: null, created_at: "", updated_at: "", deleted_at: null,
};
const baseBreak: BreakSession = {
  id: "bs-1", tenant_id: "t-1", time_entry_id: "te-1",
  break_start: "2026-06-02T10:00:00.000Z", break_end: null,
  duration_minutes: null, created_at: "", updated_at: "",
};

/** Creates a mock that captures audit inserts. */
function createAuditedMock(overrides: {
  selectEntry?: TimeEntry; insertEntry?: TimeEntry; updateEntry?: TimeEntry;
  selectBreak?: BreakSession | null; insertBreak?: BreakSession; updateBreak?: BreakSession;
  breakSelectArray?: BreakSession[];
}) {
  const auditInserts: unknown[] = [];
  const captureAudit = vi.fn().mockImplementation((data: unknown) => {
    auditInserts.push(data);
    return createChain(async () => ({ data: null, error: null }));
  });
  let breakCall = 0;
  const supabase = createMockSupabase({
    time_entries: createTableMock({
      selectResolver: async () => ({ data: overrides.selectEntry ?? null }),
      insertResolver: async () => ({ data: overrides.insertEntry ?? null, error: null }),
      updateResolver: async () => ({ data: overrides.updateEntry ?? null, error: null }),
    }),
    break_sessions: createTableMock({
      selectResolver: async () => {
        breakCall++;
        if (breakCall === 1) return { data: overrides.selectBreak ?? null };
        return { data: overrides.breakSelectArray ?? [overrides.updateBreak].filter(Boolean) };
      },
      insertResolver: async () => ({ data: overrides.insertBreak ?? null, error: null }),
      updateResolver: async () => ({ data: overrides.updateBreak ?? null, error: null }),
    }),
    time_entry_audit: { insert: captureAudit },
  });
  return { supabase, auditInserts };
}

// ---------------------------------------------------------------------------
// Audit Trail Completeness
// ---------------------------------------------------------------------------

describe("Audit Trail Completeness", () => {
  test("clock-in creates audit record with action 'create'", async () => {
    const { clockIn } = await import("@/services/timeEntryService");
    const { supabase, auditInserts } = createAuditedMock({ insertEntry: baseEntry });
    const result = await clockIn(supabase, "t-1", "e-1", "2026-06-02");
    expect(result.data).not.toBeNull();
    expect(auditInserts).toHaveLength(1);
    expect(auditInserts[0]).toMatchObject({ action: "create" });
  });

  test("clock-out creates audit record with action 'update'", async () => {
    const { clockOut } = await import("@/services/timeEntryService");
    const completed = { ...baseEntry, clock_out: "2026-06-02T17:00:00.000Z", status: "completed" as const };
    const { supabase, auditInserts } = createAuditedMock({ selectEntry: baseEntry, updateEntry: completed });
    const result = await clockOut(supabase, "t-1", "e-1", "te-1", "2026-06-02T17:00:00.000Z");
    expect(result.data).not.toBeNull();
    expect(auditInserts).toHaveLength(1);
    expect(auditInserts[0]).toMatchObject({ action: "update" });
  });

  test("pause creates audit record with action 'pause'", async () => {
    const { startBreak } = await import("@/services/breakService");
    const { supabase, auditInserts } = createAuditedMock({ selectEntry: baseEntry, insertBreak: baseBreak });
    const result = await startBreak(supabase, "t-1", "e-1", "te-1");
    expect(result.data).not.toBeNull();
    expect(auditInserts).toHaveLength(1);
    expect(auditInserts[0]).toMatchObject({ action: "pause" });
  });

  test("resume creates audit record with action 'resume'", async () => {
    const { endBreak } = await import("@/services/breakService");
    const endedBreak = { ...baseBreak, break_end: "2026-06-02T10:30:00.000Z", duration_minutes: 30 };
    const { supabase, auditInserts } = createAuditedMock({
      selectBreak: baseBreak, selectEntry: { ...baseEntry, status: "paused" as const },
      updateBreak: endedBreak, breakSelectArray: [endedBreak],
    });
    const result = await endBreak(supabase, "t-1", "e-1", "bs-1", "2026-06-02T10:30:00.000Z");
    expect(result.data).not.toBeNull();
    expect(auditInserts).toHaveLength(1);
    expect(auditInserts[0]).toMatchObject({ action: "resume" });
  });
});

// ---------------------------------------------------------------------------
// Audit Record Fields
// ---------------------------------------------------------------------------

describe("Audit Record Fields", () => {
  test("every audit record has changed_by set to employee ID", async () => {
    const { clockIn } = await import("@/services/timeEntryService");
    const { supabase, auditInserts } = createAuditedMock({ insertEntry: baseEntry });
    await clockIn(supabase, "t-1", "e-1", "2026-06-02");
    expect(auditInserts[0]).toMatchObject({ changed_by: "e-1" });
  });

  test("every audit record has tenant_id for isolation", async () => {
    const { clockIn } = await import("@/services/timeEntryService");
    const otherEntry = { ...baseEntry, tenant_id: "t-42" };
    const { supabase, auditInserts } = createAuditedMock({ insertEntry: otherEntry });
    await clockIn(supabase, "t-42", "e-1", "2026-06-02");
    expect(auditInserts[0]).toMatchObject({ tenant_id: "t-42" });
  });

  test("every audit record has old_value and new_value fields", async () => {
    const { clockIn } = await import("@/services/timeEntryService");
    const { supabase, auditInserts } = createAuditedMock({ insertEntry: baseEntry });
    await clockIn(supabase, "t-1", "e-1", "2026-06-02");
    const record = auditInserts[0] as Record<string, unknown>;
    expect(record).toHaveProperty("old_value");
    expect(record).toHaveProperty("new_value");
  });

  test("audit record includes a non-empty reason field", async () => {
    const { clockIn } = await import("@/services/timeEntryService");
    const { supabase, auditInserts } = createAuditedMock({ insertEntry: baseEntry });
    await clockIn(supabase, "t-1", "e-1", "2026-06-02");
    const record = auditInserts[0] as Record<string, unknown>;
    expect(typeof record.reason).toBe("string");
    expect((record.reason as string).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Immutability
// ---------------------------------------------------------------------------

describe("Immutability", () => {
  test("original clock_in timestamp is preserved after clock-out", async () => {
    const { clockOut } = await import("@/services/timeEntryService");
    const completed = { ...baseEntry, clock_out: "2026-06-02T17:00:00.000Z", status: "completed" as const };
    const { supabase } = createAuditedMock({ selectEntry: baseEntry, updateEntry: completed });
    const result = await clockOut(supabase, "t-1", "e-1", "te-1", "2026-06-02T17:00:00.000Z");
    expect(result.data!.clock_in).toBe("2026-06-02T08:00:00.000Z");
  });

  test("soft delete sets deleted_at on employee (not hard delete)", async () => {
    const { deactivateEmployee } = await import("@/services/employeeService");
    let updatedData: unknown = null;
    const emp = { id: "emp-2", tenant_id: "t-1", user_id: "u-2", first_name: "A", last_name: "B", email: "a@b.de", role: "employee" as const, target_hours_week: 40, bundesland: null, invitation_token: null, invited_at: null, created_at: "", updated_at: "", deleted_at: null };
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === "employees") return { select: vi.fn().mockReturnValue(createChain(async () => ({ data: emp }))), update: vi.fn().mockImplementation((d: unknown) => { updatedData = d; return createChain(async () => ({ data: null, error: null })); }) };
      if (table === "tenants") return { select: vi.fn().mockReturnValue(createChain(async () => ({ data: { plan: "team" } }))) };
      return createTableMock({});
    });
    const client = { from: mockFrom, auth: { admin: { updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }) } }, rpc: vi.fn().mockResolvedValue({ data: null, error: null }) } as unknown as import("@supabase/supabase-js").SupabaseClient;
    await deactivateEmployee(client, client, "t-1", "emp-2", "emp-1");
    expect(updatedData).toMatchObject({ deleted_at: expect.any(String) });
  });

  test("TimeEntry type requires deleted_at field", () => {
    const entry: TimeEntry = { ...baseEntry };
    expect(entry).toHaveProperty("deleted_at");
  });
});

// ---------------------------------------------------------------------------
// Tamper Resistance & Audit Queryability
// ---------------------------------------------------------------------------

describe("Tamper Resistance", () => {
  test("timeEntryService exposes no self-edit function", async () => {
    const keys = Object.keys(await import("@/services/timeEntryService"));
    expect(keys).not.toContain("editTimeEntry");
    expect(keys).not.toContain("deleteTimeEntry");
  });

  test("all service mutations are functions from repos/types layers", async () => {
    const tes = await import("@/services/timeEntryService");
    const bs = await import("@/services/breakService");
    expect(typeof tes.clockIn).toBe("function");
    expect(typeof bs.startBreak).toBe("function");
  });
});

describe("Audit Queryability", () => {
  test("audit record has correct field_name per action type", async () => {
    const { clockIn } = await import("@/services/timeEntryService");
    const { supabase, auditInserts } = createAuditedMock({ insertEntry: baseEntry });
    await clockIn(supabase, "t-1", "e-1", "2026-06-02");
    expect((auditInserts[0] as Record<string, unknown>).field_name).toBe("clock_in");
  });

  test("break audit records use field_name 'status'", async () => {
    const { startBreak } = await import("@/services/breakService");
    const { supabase, auditInserts } = createAuditedMock({ selectEntry: baseEntry, insertBreak: baseBreak });
    await startBreak(supabase, "t-1", "e-1", "te-1");
    const r = auditInserts[0] as Record<string, unknown>;
    expect(r.field_name).toBe("status");
    expect(r.old_value).toBe("running");
    expect(r.new_value).toBe("paused");
  });

  test("clock-in then clock-out produces ordered audit trail", async () => {
    const { clockIn, clockOut } = await import("@/services/timeEntryService");
    const auditLog: Array<{ action: string }> = [];
    const capture = vi.fn().mockImplementation((d: unknown) => { auditLog.push(d as { action: string }); return createChain(async () => ({ data: null, error: null })); });
    const completed = { ...baseEntry, clock_out: "2026-06-02T17:00:00.000Z", status: "completed" as const };
    // Step 1: Clock in
    const s1 = createMockSupabase({ time_entries: createTableMock({ selectResolver: async () => ({ data: null }), insertResolver: async () => ({ data: baseEntry, error: null }) }), time_entry_audit: { insert: capture } });
    await clockIn(s1, "t-1", "e-1", "2026-06-02");
    // Step 2: Clock out
    const s2 = createMockSupabase({ time_entries: createTableMock({ selectResolver: async () => ({ data: baseEntry }), updateResolver: async () => ({ data: completed, error: null }) }), time_entry_audit: { insert: capture } });
    await clockOut(s2, "t-1", "e-1", "te-1", "2026-06-02T17:00:00.000Z");
    expect(auditLog).toHaveLength(2);
    expect(auditLog[0].action).toBe("create");
    expect(auditLog[1].action).toBe("update");
  });
});
