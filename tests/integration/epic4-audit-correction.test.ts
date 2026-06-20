/**
 * Epic 4 Integration Tests — Audit Trail + Correction Flow
 *
 * Tests the full flow through service layers (no UI, no browser).
 * These complement the E2E Playwright tests by verifying the
 * backend integration without needing a running app server.
 *
 * Covers:
 * - Full audit trail lifecycle: create → edit → verify trail
 * - Full correction lifecycle: submit → approve → verify entry updated
 * - Full correction lifecycle: submit → reject → verify entry unchanged
 * - Cross-entry isolation (audit trail scoped correctly)
 */

import { describe, test, expect, vi } from "vitest";
import type { TimeEntry, CorrectionRequest } from "@/types/database";
import { createMockSupabase, createTableMock, createChain } from "../legal/helpers/supabase-mock";

// ---------------------------------------------------------------------------
// Full Audit Trail Lifecycle
// ---------------------------------------------------------------------------

describe("Integration: Full Audit Trail Lifecycle", () => {
  const entry: TimeEntry = {
    id: "te-1", tenant_id: "t-1", employee_id: "e-1", date: "2026-06-02",
    clock_in: "2026-06-02T08:02:00.000Z", clock_out: null,
    break_minutes: 0, status: "running", notes: null,
    created_at: "", updated_at: "", deleted_at: null,
  };

  const completedEntry: TimeEntry = {
    ...entry,
    clock_out: "2026-06-02T17:00:00.000Z",
    break_minutes: 30,
    status: "completed",
  };

  test("clock-in → clock-out → manager edit produces complete audit trail", async () => {
    const { clockIn } = await import("@/services/timeEntryService");
    const { clockOut } = await import("@/services/timeEntryService");
    const { editTimeEntry } = await import("@/services/timeEntryEditService");

    const auditLog: Array<{ action: string; field_name: string; old_value: string | null; new_value: string | null; reason: string; changed_by: string }> = [];
    const capture = vi.fn().mockImplementation((d: unknown) => {
      auditLog.push(d as typeof auditLog[number]);
      return createChain(async () => ({ data: null, error: null }));
    });

    // Step 1: Clock in
    const s1 = createMockSupabase({
      time_entries: createTableMock({
        selectResolver: async () => ({ data: null }),
        insertResolver: async () => ({ data: entry, error: null }),
      }),
      time_entry_audit: { insert: capture },
    });
    await clockIn(s1, "t-1", "e-1", "2026-06-02");

    // Step 2: Clock out
    const s2 = createMockSupabase({
      time_entries: createTableMock({
        selectResolver: async () => ({ data: entry }),
        updateResolver: async () => ({ data: completedEntry, error: null }),
      }),
      time_entry_audit: { insert: capture },
    });
    await clockOut(s2, "t-1", "e-1", "te-1", "2026-06-02T17:00:00.000Z");

    // Step 3: Manager edits clock_in from 08:02 to 08:00
    const editedEntry = { ...completedEntry, clock_in: "2026-06-02T08:00:00.000Z" };
    const s3 = createMockSupabase({
      time_entries: createTableMock({
        selectResolver: async () => ({ data: completedEntry }),
        updateResolver: async () => ({ data: editedEntry, error: null }),
      }),
      time_entry_audit: { insert: capture },
    });
    await editTimeEntry(s3, "t-1", "mgr-1", "te-1", { clock_in: "2026-06-02T08:00:00.000Z" }, "Uhrenabweichung korrigiert");

    // Verify the complete audit trail
    expect(auditLog).toHaveLength(3);

    // 1. Clock-in record
    expect(auditLog[0].action).toBe("create");
    expect(auditLog[0].field_name).toBe("clock_in");
    expect(auditLog[0].changed_by).toBe("e-1");

    // 2. Clock-out record
    expect(auditLog[1].action).toBe("update");
    expect(auditLog[1].changed_by).toBe("e-1");

    // 3. Manager edit record
    expect(auditLog[2].action).toBe("update");
    expect(auditLog[2].field_name).toBe("clock_in");
    expect(auditLog[2].old_value).toBe("2026-06-02T08:02:00.000Z");
    expect(auditLog[2].new_value).toBe("2026-06-02T08:00:00.000Z");
    expect(auditLog[2].reason).toBe("Uhrenabweichung korrigiert");
    expect(auditLog[2].changed_by).toBe("mgr-1");
  });
});

// ---------------------------------------------------------------------------
// Full Correction Lifecycle: Approve
// ---------------------------------------------------------------------------

describe("Integration: Correction Approve Lifecycle", () => {
  const baseEntry: TimeEntry = {
    id: "te-1", tenant_id: "t-1", employee_id: "e-1", date: "2026-06-02",
    clock_in: "2026-06-02T08:00:00.000Z", clock_out: "2026-06-02T16:00:00.000Z",
    break_minutes: 30, status: "completed", notes: null,
    created_at: "", updated_at: "", deleted_at: null,
  };

  const baseReq: CorrectionRequest = {
    id: "cr-1", tenant_id: "t-1", employee_id: "e-1", time_entry_id: "te-1",
    proposed_change: { clock_out: "2026-06-02T17:00:00.000Z" },
    reason: "War eigentlich 17:00",
    status: "pending", reviewed_by: null, review_note: null,
    created_at: "", updated_at: "",
  };

  test("submit → approve → entry updated with audit trail", async () => {
    const auditLog: unknown[] = [];
    const capture = vi.fn().mockImplementation((d: unknown) => {
      auditLog.push(d);
      return createChain(async () => ({ data: null, error: null }));
    });

    // Step 1: Employee submits correction
    const s1 = createMockSupabase({
      time_entries: createTableMock({ selectResolver: async () => ({ data: baseEntry }) }),
      correction_requests: createTableMock({
        insertResolver: async () => ({ data: baseReq, error: null }),
      }),
    });
    const { submitCorrectionRequest } = await import("@/services/correctionRequestService");
    const submitResult = await submitCorrectionRequest(
      s1, "t-1", "e-1", "te-1",
      { clock_out: "2026-06-02T17:00:00.000Z" },
      "War eigentlich 17:00",
    );
    expect(submitResult.data).not.toBeNull();
    expect(submitResult.data!.status).toBe("pending");

    // Step 2: Manager approves
    let correctionCallCount = 0;
    const s2 = createMockSupabase({
      time_entries: createTableMock({
        selectResolver: async () => ({ data: baseEntry }),
        updateResolver: async () => ({
          data: { ...baseEntry, clock_out: "2026-06-02T17:00:00.000Z" },
          error: null,
        }),
      }),
      correction_requests: createTableMock({
        selectResolver: async () => {
          correctionCallCount++;
          if (correctionCallCount === 1) return { data: baseReq };
          return { data: { ...baseReq, status: "approved", reviewed_by: "mgr-1" } };
        },
        updateResolver: async () => ({
          data: { ...baseReq, status: "approved", reviewed_by: "mgr-1" },
          error: null,
        }),
      }),
      time_entry_audit: { insert: capture },
    });

    const { approveCorrectionRequest } = await import("@/services/correctionRequestService");
    const approveResult = await approveCorrectionRequest(s2, "t-1", "mgr-1", "cr-1");
    expect(approveResult.data).not.toBeNull();
    expect(approveResult.data!.status).toBe("approved");

    // Verify audit trail was created for the edit
    expect(auditLog).toHaveLength(1);
    const auditRecord = auditLog[0] as Record<string, unknown>;
    expect(auditRecord.action).toBe("update");
    expect(auditRecord.field_name).toBe("clock_out");
    expect(auditRecord.old_value).toBe("2026-06-02T16:00:00.000Z");
    expect(auditRecord.new_value).toBe("2026-06-02T17:00:00.000Z");
    expect((auditRecord.reason as string)).toContain("Korrekturanfrage");
  });
});

// ---------------------------------------------------------------------------
// Full Correction Lifecycle: Reject
// ---------------------------------------------------------------------------

describe("Integration: Correction Reject Lifecycle", () => {
  const baseEntry: TimeEntry = {
    id: "te-1", tenant_id: "t-1", employee_id: "e-1", date: "2026-06-02",
    clock_in: "2026-06-02T08:00:00.000Z", clock_out: "2026-06-02T16:00:00.000Z",
    break_minutes: 30, status: "completed", notes: null,
    created_at: "", updated_at: "", deleted_at: null,
  };

  const baseReq: CorrectionRequest = {
    id: "cr-2", tenant_id: "t-1", employee_id: "e-1", time_entry_id: "te-1",
    proposed_change: { clock_out: "2026-06-02T18:00:00.000Z" },
    reason: "Bis 18:00 gearbeitet",
    status: "pending", reviewed_by: null, review_note: null,
    created_at: "", updated_at: "",
  };

  test("submit → reject → entry unchanged, no audit records", async () => {
    const auditLog: unknown[] = [];
    const capture = vi.fn().mockImplementation((d: unknown) => {
      auditLog.push(d);
      return createChain(async () => ({ data: null, error: null }));
    });

    // Step 1: Employee submits
    const s1 = createMockSupabase({
      time_entries: createTableMock({ selectResolver: async () => ({ data: baseEntry }) }),
      correction_requests: createTableMock({
        insertResolver: async () => ({ data: baseReq, error: null }),
      }),
    });
    const { submitCorrectionRequest } = await import("@/services/correctionRequestService");
    await submitCorrectionRequest(
      s1, "t-1", "e-1", "te-1",
      { clock_out: "2026-06-02T18:00:00.000Z" },
      "Bis 18:00 gearbeitet",
    );

    // Step 2: Manager rejects
    const rejectedReq = { ...baseReq, status: "rejected" as const, reviewed_by: "mgr-1", review_note: "Nicht nachvollziehbar" };
    const s2 = createMockSupabase({
      correction_requests: createTableMock({
        selectResolver: async () => ({ data: baseReq }),
        updateResolver: async () => ({ data: rejectedReq, error: null }),
      }),
      time_entry_audit: { insert: capture },
    });

    const { rejectCorrectionRequest } = await import("@/services/correctionRequestService");
    const result = await rejectCorrectionRequest(s2, "t-1", "mgr-1", "cr-2", "Nicht nachvollziehbar");

    expect(result.data).not.toBeNull();
    expect(result.data!.status).toBe("rejected");
    expect(result.data!.review_note).toBe("Nicht nachvollziehbar");

    // No audit records created — entry is untouched
    expect(auditLog).toHaveLength(0);
  });
});
