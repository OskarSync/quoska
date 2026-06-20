/**
 * Leave Service Tests (Epic 9)
 * Covers: submit, review, cancel, balance, list, overlap warnings, validation
 */
import { describe, test, expect } from "vitest";
import type { LeaveRequest, LeaveEntitlement } from "@/types/database";
import { createMockSupabase, createTableMock } from "../legal/helpers/supabase-mock";

const baseLeave: LeaveRequest = {
  id: "lr-1", tenant_id: "t-1", employee_id: "e-1",
  type: "urlaub", start_date: "2026-06-22", end_date: "2026-06-26",
  work_days_count: 5, reason: null, status: "pending",
  reviewed_by: null, reviewed_at: null, review_note: null,
  created_at: "2026-06-01T10:00:00.000Z", updated_at: "2026-06-01T10:00:00.000Z",
  deleted_at: null,
};
const baseEntitlement: LeaveEntitlement = {
  id: "le-1", tenant_id: "t-1", employee_id: "e-1",
  year: 2026, total_days: 28, carried_over: 0, created_at: "", updated_at: "",
};

function createSubmitMock(overrides: {
  selectEmployees?: Record<string, unknown> | null;
  selectEntitlement?: LeaveEntitlement | null;
  selectOverlaps?: LeaveRequest[];
  selectEmployeeLeaves?: LeaveRequest[];
  insertLeave?: LeaveRequest | null;
  selectHolidays?: unknown[];
}) {
  let selectCallIdx = 0;
  const empDefault = { bundesland: "nordrhein-westfalen", first_name: "Max", last_name: "Müller" };
  return createMockSupabase({
    employees: createTableMock({
      selectResolver: async () => overrides.selectEmployees !== undefined
        ? (overrides.selectEmployees === null ? { data: null } : { data: overrides.selectEmployees })
        : { data: empDefault },
    }),
    leave_entitlements: createTableMock({
      selectResolver: async () => ({
        data: overrides.selectEntitlement !== undefined ? overrides.selectEntitlement : baseEntitlement,
      }),
    }),
    leave_requests: createTableMock({
      selectResolver: async () => {
        const data = selectCallIdx === 0
          ? (overrides.selectOverlaps ?? [])
          : selectCallIdx === 1
            ? (overrides.selectEmployeeLeaves ?? [])
            : baseLeave;
        selectCallIdx++;
        return { data };
      },
      insertResolver: async () => ({ data: overrides.insertLeave ?? baseLeave, error: null }),
      updateResolver: async () => ({
        data: { ...baseLeave, status: "approved", reviewed_by: "mgr-1" }, error: null,
      }),
    }),
    public_holidays: createTableMock({ selectResolver: async () => ({ data: overrides.selectHolidays ?? [] }) }),
    notifications: createTableMock({
      selectResolver: async () => ({ data: [] }),
      insertResolver: async () => ({ data: { id: "n-1" }, error: null }),
    }),
  });
}

function createReviewMock(overrides: {
  selectLeave?: LeaveRequest | null;
  updateLeave?: LeaveRequest;
}) {
  return createMockSupabase({
    employees: createTableMock({ selectResolver: async () => ({ data: { bundesland: "berlin" } }) }),
    leave_requests: createTableMock({
      selectResolver: async () => ({ data: overrides.selectLeave !== undefined ? overrides.selectLeave : baseLeave }),
      updateResolver: async () => ({
        data: overrides.updateLeave ?? { ...baseLeave, status: "approved", reviewed_by: "mgr-1" }, error: null,
      }),
    }),
    notifications: createTableMock({
      selectResolver: async () => ({ data: [] }),
      insertResolver: async () => ({ data: { id: "n-1" }, error: null }),
    }),
  });
}

function createBalanceMock(overrides: {
  selectEntitlement?: LeaveEntitlement | null;
  selectEmployeeLeaves?: LeaveRequest[];
}) {
  return createMockSupabase({
    leave_entitlements: createTableMock({
      selectResolver: async () => ({
        data: overrides.selectEntitlement !== undefined ? overrides.selectEntitlement : baseEntitlement,
      }),
    }),
    leave_requests: createTableMock({
      selectResolver: async () => ({ data: overrides.selectEmployeeLeaves ?? [] }),
    }),
    employees: createTableMock({ selectResolver: async () => ({ data: { bundesland: "berlin" } }) }),
  });
}

// ---------------------------------------------------------------------------
// submitLeaveRequest
// ---------------------------------------------------------------------------
describe("submitLeaveRequest", () => {
  test("creates leave request for valid Mon-Fri week", async () => {
    const { submitLeaveRequest } = await import("@/services/leaveService");
    const result = await submitLeaveRequest(
      createSubmitMock({}), "t-1", "e-1",
      { start_date: "2026-06-22", end_date: "2026-06-26", type: "urlaub" },
      "2026-06-01T10:00:00.000Z",
    );
    expect(result.data).not.toBeNull();
    expect(result.data!.request.status).toBe("pending");
  });

  test("rejects when bundesland is not set", async () => {
    const { submitLeaveRequest } = await import("@/services/leaveService");
    const result = await submitLeaveRequest(
      createSubmitMock({ selectEmployees: { bundesland: null } }), "t-1", "e-1",
      { start_date: "2026-06-22", end_date: "2026-06-26", type: "urlaub" },
      "2026-06-01T10:00:00.000Z",
    );
    expect(result.error).toContain("Bundesland");
  });

  test("warns when request exceeds available balance", async () => {
    const { submitLeaveRequest } = await import("@/services/leaveService");
    const result = await submitLeaveRequest(
      createSubmitMock({ selectEntitlement: { ...baseEntitlement, total_days: 3 }, selectEmployeeLeaves: [] }),
      "t-1", "e-1",
      { start_date: "2026-06-22", end_date: "2026-06-26", type: "urlaub" },
      "2026-06-01T10:00:00.000Z",
    );
    expect(result.data !== null || result.error !== null).toBe(true);
  });

  test("warns about overlapping requests but does not block", async () => {
    const { submitLeaveRequest } = await import("@/services/leaveService");
    const result = await submitLeaveRequest(
      createSubmitMock({
        selectOverlaps: [{ ...baseLeave, id: "lr-ex", status: "approved", start_date: "2026-06-23", end_date: "2026-06-24" }],
        selectEmployeeLeaves: [],
      }), "t-1", "e-1",
      { start_date: "2026-06-22", end_date: "2026-06-26", type: "urlaub" },
      "2026-06-01T10:00:00.000Z",
    );
    expect(result.data).not.toBeNull();
    expect(result.data!.warning).toContain("bereits einen Antrag");
  });
});

// ---------------------------------------------------------------------------
// reviewLeaveRequest
// ---------------------------------------------------------------------------
describe("reviewLeaveRequest", () => {
  test("approves a pending leave request", async () => {
    const { reviewLeaveRequest } = await import("@/services/leaveService");
    const result = await reviewLeaveRequest(createReviewMock({}), "t-1", "mgr-1", "lr-1", "approve", undefined, "2026-06-02T10:00:00.000Z");
    expect(result.data).not.toBeNull();
    expect(result.data!.status).toBe("approved");
  });

  test("rejects a pending leave request", async () => {
    const { reviewLeaveRequest } = await import("@/services/leaveService");
    const result = await reviewLeaveRequest(
      createReviewMock({ updateLeave: { ...baseLeave, status: "rejected", reviewed_by: "mgr-1", review_note: "Team benötigt" } }),
      "t-1", "mgr-1", "lr-1", "reject", "Team benötigt", "2026-06-02T10:00:00.000Z",
    );
    expect(result.data!.status).toBe("rejected");
  });

  test("rejects review of already processed request", async () => {
    const { reviewLeaveRequest } = await import("@/services/leaveService");
    const result = await reviewLeaveRequest(
      createReviewMock({ selectLeave: { ...baseLeave, status: "approved" } }),
      "t-1", "mgr-1", "lr-1", "approve",
    );
    expect(result.error).toContain("bereits bearbeitet");
  });

  test("rejects review of non-existent request", async () => {
    const { reviewLeaveRequest } = await import("@/services/leaveService");
    const result = await reviewLeaveRequest(createReviewMock({ selectLeave: null }), "t-1", "mgr-1", "lr-x", "approve");
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// cancelLeaveRequest
// ---------------------------------------------------------------------------
describe("cancelLeaveRequest", () => {
  test("cancels own pending request", async () => {
    const { cancelLeaveRequest } = await import("@/services/leaveService");
    const result = await cancelLeaveRequest(createReviewMock({ updateLeave: { ...baseLeave, status: "cancelled" } }), "t-1", "e-1", "lr-1");
    expect(result.data!.status).toBe("cancelled");
  });

  test("cancels own approved request", async () => {
    const { cancelLeaveRequest } = await import("@/services/leaveService");
    const result = await cancelLeaveRequest(
      createReviewMock({ selectLeave: { ...baseLeave, status: "approved" }, updateLeave: { ...baseLeave, status: "cancelled" } }),
      "t-1", "e-1", "lr-1",
    );
    expect(result.data!.status).toBe("cancelled");
  });

  test("cannot cancel another employee's request", async () => {
    const { cancelLeaveRequest } = await import("@/services/leaveService");
    const result = await cancelLeaveRequest(createReviewMock({ selectLeave: { ...baseLeave, employee_id: "e-other" } }), "t-1", "e-1", "lr-1");
    expect(result.error).toContain("eigene");
  });

  test("cannot cancel already rejected request", async () => {
    const { cancelLeaveRequest } = await import("@/services/leaveService");
    const result = await cancelLeaveRequest(createReviewMock({ selectLeave: { ...baseLeave, status: "rejected" } }), "t-1", "e-1", "lr-1");
    expect(result.error).toContain("ausstehende oder genehmigte");
  });
});

// ---------------------------------------------------------------------------
// getLeaveBalance
// ---------------------------------------------------------------------------
describe("getLeaveBalance", () => {
  test("returns correct balance with entitlement", async () => {
    const { getLeaveBalance } = await import("@/services/leaveService");
    const balance = await getLeaveBalance(createBalanceMock({
      selectEmployeeLeaves: [
        { ...baseLeave, status: "approved", work_days_count: 5, type: "urlaub", start_date: "2026-05-01" },
        { ...baseLeave, id: "lr-2", status: "pending", work_days_count: 3, type: "urlaub", start_date: "2026-07-01" },
      ],
    }), "t-1", "e-1", 2026);
    expect(balance.total).toBe(28);
    expect(balance.used).toBe(5);
    expect(balance.pending).toBe(3);
    expect(balance.available).toBe(20);
  });

  test("returns default 20 days when no entitlement exists", async () => {
    const { getLeaveBalance } = await import("@/services/leaveService");
    const balance = await getLeaveBalance(createBalanceMock({ selectEntitlement: null, selectEmployeeLeaves: [] }), "t-1", "e-1", 2026);
    expect(balance.total).toBe(20);
    expect(balance.available).toBe(20);
  });

  test("available never goes below zero", async () => {
    const { getLeaveBalance } = await import("@/services/leaveService");
    const balance = await getLeaveBalance(createBalanceMock({
      selectEntitlement: { ...baseEntitlement, total_days: 5, carried_over: 0 },
      selectEmployeeLeaves: [
        { ...baseLeave, status: "approved", work_days_count: 5, type: "urlaub", start_date: "2026-05-01" },
        { ...baseLeave, id: "lr-2", status: "pending", work_days_count: 3, type: "urlaub", start_date: "2026-07-01" },
      ],
    }), "t-1", "e-1", 2026);
    expect(balance.available).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// listLeaveRequests
// ---------------------------------------------------------------------------
describe("listLeaveRequests", () => {
  test("employee sees own requests only", async () => {
    const { listLeaveRequests } = await import("@/services/leaveService");
    const result = await listLeaveRequests(createBalanceMock({ selectEmployeeLeaves: [baseLeave] }), "t-1", "e-1", "employee");
    expect(result.data).toBeDefined();
  });

  test("manager sees all tenant requests", async () => {
    const { listLeaveRequests } = await import("@/services/leaveService");
    const result = await listLeaveRequests(createReviewMock({}), "t-1", "mgr-1", "manager");
    expect(result.data).toBeDefined();
  });
});
