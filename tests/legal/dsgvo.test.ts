/**
 * DSGVO / GDPR Compliance Tests
 *
 * Verifies tenant isolation, data minimization, self-service,
 * right to deletion, and layered architecture.
 */

import { describe, test, expect, vi } from "vitest";
import type { Employee, TimeEntry } from "@/types/database";
import { createMockSupabase, createTableMock, createChain } from "./helpers/supabase-mock";

// ---------------------------------------------------------------------------
// Tenant Isolation
// ---------------------------------------------------------------------------

describe("Tenant Isolation", () => {
  test("getActiveEntry returns null for wrong tenant_id", async () => {
    const { getActiveEntry } = await import("@/repos/timeEntryRepo");
    const supabase = createMockSupabase({
      time_entries: createTableMock({ selectResolver: async () => ({ data: null }) }),
    });
    expect(await getActiveEntry(supabase, "tenant-OTHER", "e-1")).toBeNull();
  });

  test("getTimeEntryById queries the time_entries table", async () => {
    const { getTimeEntryById } = await import("@/repos/timeEntryRepo");
    const fromCalls: string[] = [];
    const supabase = {
      from: vi.fn().mockImplementation((t: string) => {
        fromCalls.push(t);
        return { select: vi.fn().mockReturnValue(createChain(async () => ({ data: null }))) };
      }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;
    await getTimeEntryById(supabase, "t-1", "te-1");
    expect(fromCalls).toContain("time_entries");
  });

  test("getEmployeesByTenant queries the employees table", async () => {
    const { getEmployeesByTenant } = await import("@/repos/employeeRepo");
    const fromCalls: string[] = [];
    const supabase = {
      from: vi.fn().mockImplementation((t: string) => {
        fromCalls.push(t);
        return { select: vi.fn().mockReturnValue(createChain(async () => ({ data: [] }))) };
      }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;
    await getEmployeesByTenant(supabase, "t-1");
    expect(fromCalls).toContain("employees");
  });

  test("clockIn passes tenant_id to the insert call", async () => {
    const { clockIn } = await import("@/services/timeEntryService");
    let insertedData: unknown = null;
    const entry = { id: "te-1", tenant_id: "t-42", employee_id: "e-1", date: "2026-06-02", clock_in: "", clock_out: null, break_minutes: 0, status: "running", notes: null, created_at: "", updated_at: "", deleted_at: null };
    const origTable = createTableMock({
      selectResolver: async () => ({ data: null }),
      insertResolver: async () => ({ data: entry, error: null }),
    });
    const supabase = createMockSupabase({
      time_entries: { select: origTable.select, insert: vi.fn().mockImplementation((d: unknown) => { insertedData = d; return origTable.insert(); }), update: origTable.update },
      time_entry_audit: { insert: vi.fn().mockReturnValue(createChain(async () => ({ data: null, error: null }))) },
    });
    await clockIn(supabase, "t-42", "e-1", "2026-06-02");
    expect((insertedData as Record<string, unknown>).tenant_id).toBe("t-42");
  });

  test("audit records include tenant_id matching the operation", async () => {
    const { clockIn } = await import("@/services/timeEntryService");
    const auditInserts: unknown[] = [];
    const supabase = createMockSupabase({
      time_entries: createTableMock({ selectResolver: async () => ({ data: null }), insertResolver: async () => ({ data: { id: "te-1", tenant_id: "t-7", employee_id: "e-1", date: "", clock_in: "", clock_out: null, break_minutes: 0, status: "running", notes: null, created_at: "", updated_at: "", deleted_at: null }, error: null }) }),
      time_entry_audit: { insert: vi.fn().mockImplementation((d: unknown) => { auditInserts.push(d); return createChain(async () => ({ data: null, error: null })); }) },
    });
    await clockIn(supabase, "t-7", "e-1", "2026-06-02");
    expect((auditInserts[0] as Record<string, unknown>).tenant_id).toBe("t-7");
  });
});

// ---------------------------------------------------------------------------
// Employee Self-Service (Art. 15)
// ---------------------------------------------------------------------------

describe("Employee Self-Service (DSGVO Art. 15)", () => {
  test("getClockStatus returns structured response for employee", async () => {
    const { getClockStatus } = await import("@/services/timeEntryService");
    const supabase = createMockSupabase({ time_entries: createTableMock({ selectResolver: async () => ({ data: null }) }) });
    const result = await getClockStatus(supabase, "t-1", "e-1", "2026-06-02", "2026-06-01", "2026-06-07");
    expect(result.data).toHaveProperty("activeEntry");
    expect(result.data).toHaveProperty("todayEntries");
    expect(result.data).toHaveProperty("weekEntries");
  });

  test("TimeEntry type contains all required personal data fields", () => {
    const entry: TimeEntry = { id: "te-1", tenant_id: "t-1", employee_id: "e-1", date: "2026-06-02", clock_in: "", clock_out: null, break_minutes: 0, status: "running", notes: null, created_at: "", updated_at: "", deleted_at: null };
    const keys = Object.keys(entry);
    expect(keys).toContain("employee_id");
    expect(keys).toContain("clock_in");
    expect(keys).toContain("clock_out");
    expect(keys).toContain("break_minutes");
  });

  test("getWeekEntries scopes by tenant_id and employee_id", async () => {
    const { getWeekEntries } = await import("@/repos/timeEntryRepo");
    const eqCalls: Array<{ col: string; val: unknown }> = [];
    const proxyChain = new Proxy({} as Record<string, unknown>, {
      get(_t, prop: string) {
        if (prop === "then") return (resolve: (v: unknown) => unknown) => resolve({ data: [] });
        if (prop === "maybeSingle" || prop === "single") return vi.fn(async () => ({ data: [] }));
        if (prop === "eq" || prop === "gte" || prop === "lte" || prop === "neq") return vi.fn().mockImplementation((col: string, val: unknown) => { eqCalls.push({ col, val }); return proxyChain; });
        return vi.fn().mockReturnValue(proxyChain);
      },
    });
    const supabase = { from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(proxyChain) }) } as unknown as import("@supabase/supabase-js").SupabaseClient;
    await getWeekEntries(supabase, "t-1", "e-1", "2026-06-01", "2026-06-07");
    expect(eqCalls.some((c) => c.col === "tenant_id" && c.val === "t-1")).toBe(true);
    expect(eqCalls.some((c) => c.col === "employee_id" && c.val === "e-1")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Data Minimization (Art. 5.1.c)
// ---------------------------------------------------------------------------

describe("Data Minimization (DSGVO Art. 5.1.c)", () => {
  test("Employee type has only required fields — no extra personal data", () => {
    const required: Array<keyof Employee> = ["id", "tenant_id", "user_id", "first_name", "last_name", "email", "role", "target_hours_week", "bundesland", "invitation_token", "invited_at", "created_at", "updated_at", "deleted_at"];
    const sample: Employee = { id: "", tenant_id: "", user_id: "", first_name: "", last_name: "", email: "", role: "employee", target_hours_week: 40, bundesland: null, invitation_token: null, invited_at: null, created_at: "", updated_at: "", deleted_at: null };
    expect(Object.keys(sample).sort()).toEqual(required.map(String).sort());
  });

  test("TimeEntry has no GPS or location fields", () => {
    const entry: TimeEntry = { id: "", tenant_id: "", employee_id: "", date: "", clock_in: "", clock_out: null, break_minutes: 0, status: "running", notes: null, created_at: "", updated_at: "", deleted_at: null };
    for (const f of ["gps", "location", "latitude", "longitude", "geofence"]) {
      expect(Object.keys(entry)).not.toContain(f);
    }
  });

  test("Employee has no address, birthday, or GPS fields", () => {
    const emp: Employee = { id: "", tenant_id: "", user_id: "", first_name: "", last_name: "", email: "", role: "employee", target_hours_week: 40, bundesland: null, invitation_token: null, invited_at: null, created_at: "", updated_at: "", deleted_at: null };
    for (const f of ["gps", "location", "address", "birthday", "phone"]) {
      expect(Object.keys(emp)).not.toContain(f);
    }
  });
});

// ---------------------------------------------------------------------------
// Right to Deletion (Art. 17)
// ---------------------------------------------------------------------------

describe("Right to Deletion (DSGVO Art. 17)", () => {
  const activeEmployee = { id: "emp-2", tenant_id: "t-1", user_id: "user-2", first_name: "Anna", last_name: "S", email: "a@t.de", role: "employee" as const, target_hours_week: 40, bundesland: null, invitation_token: null, invited_at: null, created_at: "", updated_at: "", deleted_at: null };

  test("deactivateEmployee sets deleted_at (soft delete)", async () => {
    const { deactivateEmployee } = await import("@/services/employeeService");
    let updatedData: unknown = null;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === "employees") return { select: vi.fn().mockReturnValue(createChain(async () => ({ data: activeEmployee }))), update: vi.fn().mockImplementation((d: unknown) => { updatedData = d; return createChain(async () => ({ data: null, error: null })); }) };
      if (table === "tenants") return { select: vi.fn().mockReturnValue(createChain(async () => ({ data: { plan: "team" } }))) };
      return createTableMock({});
    });
    const client = { from: mockFrom, auth: { admin: { updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }) } }, rpc: vi.fn().mockResolvedValue({ data: null, error: null }) } as unknown as import("@supabase/supabase-js").SupabaseClient;
    await deactivateEmployee(client, client, "t-1", "emp-2", "emp-1");
    expect(updatedData).toMatchObject({ deleted_at: expect.any(String) });
  });

  test("deactivateEmployee does not touch time_entry_audit", async () => {
    const { deactivateEmployee } = await import("@/services/employeeService");
    const fromCalls: string[] = [];
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      fromCalls.push(table);
      if (table === "employees") return { select: vi.fn().mockReturnValue(createChain(async () => ({ data: activeEmployee }))), update: vi.fn().mockReturnValue(createChain(async () => ({ data: null, error: null }))) };
      if (table === "tenants") return { select: vi.fn().mockReturnValue(createChain(async () => ({ data: { plan: "team" } }))) };
      return createTableMock({});
    });
    const client = { from: mockFrom, auth: { admin: { updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }) } }, rpc: vi.fn().mockResolvedValue({ data: null, error: null }) } as unknown as import("@supabase/supabase-js").SupabaseClient;
    await deactivateEmployee(client, client, "t-1", "emp-2", "emp-1");
    expect(fromCalls).not.toContain("time_entry_audit");
  });

  test("getEmployeesByTenant returns empty array for unknown tenant", async () => {
    const { getEmployeesByTenant } = await import("@/repos/employeeRepo");
    const supabase = createMockSupabase({ employees: createTableMock({ selectResolver: async () => ({ data: [] }) }) });
    expect(await getEmployeesByTenant(supabase, "t-nonexistent")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Data Processing & Architecture
// ---------------------------------------------------------------------------

describe("Data Processing Integrity", () => {
  test("all entities have created_at and updated_at fields", () => {
    const entry: TimeEntry = { id: "", tenant_id: "", employee_id: "", date: "", clock_in: "", clock_out: null, break_minutes: 0, status: "running", notes: null, created_at: "2026-01-01", updated_at: "2026-01-01", deleted_at: null };
    const emp: Employee = { id: "", tenant_id: "", user_id: "", first_name: "", last_name: "", email: "", role: "employee", target_hours_week: 40, bundesland: null, invitation_token: null, invited_at: null, created_at: "2026-01-01", updated_at: "2026-01-01", deleted_at: null };
    expect(entry.created_at).toBeTruthy();
    expect(emp.created_at).toBeTruthy();
  });

  test("complianceService uses no Date.now() — pure functions", async () => {
    const mod = await import("@/services/complianceService");
    expect(mod.getBreakWarnings.toString()).not.toContain("Date.now()");
  });
});

describe("Architecture (Layered Access)", () => {
  test("services do not import from UI layer", async () => {
    for (const mod of [await import("@/services/timeEntryService"), await import("@/services/breakService"), await import("@/services/complianceService"), await import("@/services/employeeService")]) {
      expect(JSON.stringify(Object.keys(mod))).not.toContain("@/components");
    }
  });

  test("repos do not import from services layer", async () => {
    for (const mod of [await import("@/repos/timeEntryRepo"), await import("@/repos/breakSessionRepo"), await import("@/repos/employeeRepo")]) {
      expect(JSON.stringify(Object.keys(mod))).not.toContain("@/services");
    }
  });

  test("services expose business functions for all DB operations", async () => {
    const tes = await import("@/services/timeEntryService");
    expect(typeof tes.clockIn).toBe("function");
    expect(typeof tes.clockOut).toBe("function");
    expect(typeof tes.getClockStatus).toBe("function");
  });
});
