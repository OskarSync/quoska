/**
 * Correction Request Service Tests
 *
 * Tests employee correction request flow (Story 4.2).
 * Covers:
 * - Submit correction request with validation
 * - Approve correction (applies edit + updates status)
 * - Reject correction with optional note
 * - Double-action prevention (already reviewed)
 * - Ownership validation
 */

import { describe, test, expect, vi } from "vitest";
import type { TimeEntry, CorrectionRequest } from "@/types/database";
import { createMockSupabase, createTableMock, createChain } from "../legal/helpers/supabase-mock";

const baseEntry: TimeEntry = {
  id: "te-1", tenant_id: "t-1", employee_id: "e-1", date: "2026-06-02",
  clock_in: "2026-06-02T08:00:00.000Z", clock_out: "2026-06-02T17:00:00.000Z",
  break_minutes: 30, status: "completed", notes: null,
  created_at: "", updated_at: "", deleted_at: null,
};

const baseRequest: CorrectionRequest = {
  id: "cr-1", tenant_id: "t-1", employee_id: "e-1", time_entry_id: "te-1",
  proposed_change: { clock_out: "2026-06-02T18:00:00.000Z" },
  reason: "War eigentlich 18:00",
  status: "pending", reviewed_by: null, review_note: null,
  created_at: "", updated_at: "",
};

function createCorrectionMock(overrides: {
  selectEntry?: TimeEntry | null;
  selectRequest?: CorrectionRequest | null;
  insertRequest?: CorrectionRequest | null;
  updateRequest?: CorrectionRequest | null;
  updateEntry?: TimeEntry;
}) {
  let callCount = 0;
  const auditInserts: unknown[] = [];
  const captureAudit = vi.fn().mockImplementation((data: unknown) => {
    auditInserts.push(data);
    return createChain(async () => ({ data: null, error: null }));
  });

  const supabase = createMockSupabase({
    time_entries: createTableMock({
      selectResolver: async () => ({ data: overrides.selectEntry !== undefined ? overrides.selectEntry : baseEntry }),
      updateResolver: async () => ({ data: overrides.updateEntry ?? baseEntry, error: null }),
    }),
    correction_requests: createTableMock({
      selectResolver: async () => {
        callCount++;
        if (callCount === 1) {
          if (overrides.selectRequest === undefined) return { data: baseRequest };
          return { data: overrides.selectRequest };
        }
        return { data: overrides.updateRequest ?? { ...baseRequest, status: "approved", reviewed_by: "mgr-1" } };
      },
      insertResolver: async () => ({ data: overrides.insertRequest ?? baseRequest, error: null }),
      updateResolver: async () => ({ data: overrides.updateRequest ?? { ...baseRequest, status: "approved", reviewed_by: "mgr-1" }, error: null }),
    }),
    time_entry_audit: { insert: captureAudit },
  });

  return { supabase, auditInserts };
}

describe("submitCorrectionRequest", () => {
  test("creates correction request with valid input", async () => {
    const { submitCorrectionRequest } = await import("@/services/correctionRequestService");
    const { supabase } = createCorrectionMock({});
    const result = await submitCorrectionRequest(
      supabase, "t-1", "e-1", "te-1",
      { clock_out: "2026-06-02T18:00:00.000Z" },
      "War eigentlich 18:00",
    );
    expect(result.data).not.toBeNull();
    expect(result.data!.status).toBe("pending");
  });

  test("rejects submission without reason", async () => {
    const { submitCorrectionRequest } = await import("@/services/correctionRequestService");
    const { supabase } = createCorrectionMock({});
    const result = await submitCorrectionRequest(
      supabase, "t-1", "e-1", "te-1",
      { clock_out: "2026-06-02T18:00:00.000Z" },
      "",
    );
    expect(result.error).toContain("Grund");
  });

  test("rejects submission for another employee's entry", async () => {
    const { submitCorrectionRequest } = await import("@/services/correctionRequestService");
    const otherEntry = { ...baseEntry, employee_id: "e-other" };
    const { supabase } = createCorrectionMock({ selectEntry: otherEntry });
    const result = await submitCorrectionRequest(
      supabase, "t-1", "e-1", "te-1",
      { clock_out: "2026-06-02T18:00:00.000Z" },
      "Some reason",
    );
    expect(result.error).toContain("eigene");
  });

  test("rejects submission for non-existent entry", async () => {
    const { submitCorrectionRequest } = await import("@/services/correctionRequestService");
    const { supabase } = createCorrectionMock({ selectEntry: null });
    const result = await submitCorrectionRequest(
      supabase, "t-1", "e-1", "te-nonexistent",
      { clock_out: "2026-06-02T18:00:00.000Z" },
      "Some reason",
    );
    expect(result.error).toContain("nicht gefunden");
  });
});

describe("approveCorrectionRequest", () => {
  test("approves request and applies edit with audit trail", async () => {
    const { approveCorrectionRequest } = await import("@/services/correctionRequestService");
    const { supabase, auditInserts } = createCorrectionMock({});
    const result = await approveCorrectionRequest(supabase, "t-1", "mgr-1", "cr-1");
    expect(result.data).not.toBeNull();
    // The edit is applied via editTimeEntry, which creates audit records
    expect(auditInserts.length).toBeGreaterThanOrEqual(1);
  });

  test("rejects approval of already reviewed request", async () => {
    const { approveCorrectionRequest } = await import("@/services/correctionRequestService");
    const approvedRequest = { ...baseRequest, status: "approved" as const };
    const { supabase } = createCorrectionMock({ selectRequest: approvedRequest });
    const result = await approveCorrectionRequest(supabase, "t-1", "mgr-1", "cr-1");
    expect(result.error).toContain("bereits bearbeitet");
  });

  test("rejects approval of non-existent request", async () => {
    const { approveCorrectionRequest } = await import("@/services/correctionRequestService");
    const { supabase } = createCorrectionMock({ selectRequest: null });
    const result = await approveCorrectionRequest(supabase, "t-1", "mgr-1", "cr-nonexistent");
    expect(result.error).toContain("nicht gefunden");
  });
});

describe("rejectCorrectionRequest", () => {
  test("rejects request with optional note", async () => {
    const { rejectCorrectionRequest } = await import("@/services/correctionRequestService");
    const rejectedRequest = { ...baseRequest, status: "rejected" as const, reviewed_by: "mgr-1", review_note: "Nicht nachvollziehbar" };
    const { supabase } = createCorrectionMock({ updateRequest: rejectedRequest });
    const result = await rejectCorrectionRequest(supabase, "t-1", "mgr-1", "cr-1", "Nicht nachvollziehbar");
    expect(result.data).not.toBeNull();
    expect(result.data!.status).toBe("rejected");
  });

  test("rejects already reviewed request", async () => {
    const { rejectCorrectionRequest } = await import("@/services/correctionRequestService");
    const rejectedRequest = { ...baseRequest, status: "rejected" as const };
    const { supabase } = createCorrectionMock({ selectRequest: rejectedRequest });
    const result = await rejectCorrectionRequest(supabase, "t-1", "mgr-1", "cr-1");
    expect(result.error).toContain("bereits bearbeitet");
  });

  test("reject creates no audit records (time entry unchanged)", async () => {
    const { rejectCorrectionRequest } = await import("@/services/correctionRequestService");
    const rejectedRequest = { ...baseRequest, status: "rejected" as const, reviewed_by: "mgr-1" };
    const { supabase, auditInserts } = createCorrectionMock({ updateRequest: rejectedRequest });
    await rejectCorrectionRequest(supabase, "t-1", "mgr-1", "cr-1");
    expect(auditInserts).toHaveLength(0);
  });
});
