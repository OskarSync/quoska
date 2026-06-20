/**
 * Unit tests for employeeRepo.
 *
 * Uses explicit chainable mock objects (no Proxy) that handle both
 * terminal methods (.maybeSingle, .single) and direct-await patterns.
 */

import { describe, test, expect, vi } from "vitest";
import {
  getEmployeesByTenant,
  getDeactivatedEmployees,
  getEmployeeById,
  getEmployeeByEmail,
  countActiveEmployees,
  getTenantPlan,
} from "@/repos/employeeRepo";
import type { Employee } from "@/types/database";

// ---------------------------------------------------------------------------
// Chainable mock builder
// ---------------------------------------------------------------------------

/**
 * Build a query chain that supports both:
 * - Direct await: `await chain` (resolves via then)
 * - Terminal methods: `await chain.maybeSingle()` / `.single()`
 */
function buildChain(result: Promise<{ data: unknown; count?: number | null }>) {
  const chain = {
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnValue(result),
    single: vi.fn().mockReturnValue(result),
    // Make thenable for direct `await chain`
    then: (resolve: (v: unknown) => unknown, reject: (v: unknown) => unknown) => {
      result.then(resolve, reject);
    },
  };
  return chain;
}

function buildTableMock(result: Promise<{ data: unknown; error?: unknown }>) {
  const chain = buildChain(result);
  return {
    select: vi.fn().mockReturnValue(chain),
    insert: vi.fn().mockReturnValue(chain),
    update: vi.fn().mockReturnValue(chain),
  };
}

function buildCountChain(count: number | null) {
  const result = Promise.resolve({ data: null, count });
  const chain = {
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => unknown) => {
      result.then(resolve);
    },
  };
  return {
    select: vi.fn().mockReturnValue(chain),
  };
}

function createMockSupabase(
  tables: Record<string, ReturnType<typeof buildTableMock>>,
) {
  return {
    from: vi.fn().mockImplementation((table: string) => tables[table]),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const sampleEmployee: Employee = {
  id: "emp-1",
  tenant_id: "t-1",
  user_id: "u-1",
  first_name: "Anna",
  last_name: "Müller",
  email: "anna@example.com",
  role: "employee",
  target_hours_week: 40,
  bundesland: "berlin",
  invitation_token: null,
  invited_at: null,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
  deleted_at: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("employeeRepo", () => {
  describe("getEmployeesByTenant", () => {
    test("returns empty array when no employees", async () => {
      const table = buildTableMock(Promise.resolve({ data: [] }));
      const supabase = createMockSupabase({ employees: table });
      const result = await getEmployeesByTenant(supabase, "t-1");
      expect(result).toEqual([]);
    });

    test("returns employees from query result", async () => {
      const table = buildTableMock(Promise.resolve({ data: [sampleEmployee] }));
      const supabase = createMockSupabase({ employees: table });
      const result = await getEmployeesByTenant(supabase, "t-1");
      expect(result).toHaveLength(1);
      expect(result[0].first_name).toBe("Anna");
    });

    test("returns empty array when data is null", async () => {
      const table = buildTableMock(Promise.resolve({ data: null }));
      const supabase = createMockSupabase({ employees: table });
      const result = await getEmployeesByTenant(supabase, "t-1");
      expect(result).toEqual([]);
    });
  });

  describe("getDeactivatedEmployees", () => {
    test("returns empty array when no deactivated employees", async () => {
      const table = buildTableMock(Promise.resolve({ data: [] }));
      const supabase = createMockSupabase({ employees: table });
      const result = await getDeactivatedEmployees(supabase, "t-1");
      expect(result).toEqual([]);
    });

    test("returns deactivated employees", async () => {
      const deactivated: Employee = {
        ...sampleEmployee,
        deleted_at: "2026-06-01T00:00:00Z",
      };
      const table = buildTableMock(Promise.resolve({ data: [deactivated] }));
      const supabase = createMockSupabase({ employees: table });
      const result = await getDeactivatedEmployees(supabase, "t-1");
      expect(result).toHaveLength(1);
      expect(result[0].deleted_at).not.toBeNull();
    });
  });

  describe("getEmployeeById", () => {
    test("returns null when employee not found", async () => {
      const table = buildTableMock(Promise.resolve({ data: null }));
      const supabase = createMockSupabase({ employees: table });
      const result = await getEmployeeById(supabase, "t-1", "nonexistent");
      expect(result).toBeNull();
    });

    test("returns employee when found via maybeSingle", async () => {
      const table = buildTableMock(Promise.resolve({ data: sampleEmployee }));
      const supabase = createMockSupabase({ employees: table });
      const result = await getEmployeeById(supabase, "t-1", "emp-1");
      expect(result).toEqual(sampleEmployee);
    });
  });

  describe("getEmployeeByEmail", () => {
    test("returns null when email not found", async () => {
      const table = buildTableMock(Promise.resolve({ data: null }));
      const supabase = createMockSupabase({ employees: table });
      const result = await getEmployeeByEmail(supabase, "t-1", "nobody@test.com");
      expect(result).toBeNull();
    });

    test("returns employee when email matches", async () => {
      const table = buildTableMock(Promise.resolve({ data: sampleEmployee }));
      const supabase = createMockSupabase({ employees: table });
      const result = await getEmployeeByEmail(supabase, "t-1", "anna@example.com");
      expect(result?.email).toBe("anna@example.com");
    });
  });

  describe("countActiveEmployees", () => {
    test("returns 0 when no employees", async () => {
      const table = buildCountChain(0);
      const supabase = createMockSupabase({ employees: table as unknown as ReturnType<typeof buildTableMock> });
      const result = await countActiveEmployees(supabase, "t-1");
      expect(result).toBe(0);
    });

    test("returns count of active employees", async () => {
      const table = buildCountChain(5);
      const supabase = createMockSupabase({ employees: table as unknown as ReturnType<typeof buildTableMock> });
      const result = await countActiveEmployees(supabase, "t-1");
      expect(result).toBe(5);
    });

    test("returns 0 when count is null", async () => {
      const table = buildCountChain(null);
      const supabase = createMockSupabase({ employees: table as unknown as ReturnType<typeof buildTableMock> });
      const result = await countActiveEmployees(supabase, "t-1");
      expect(result).toBe(0);
    });
  });

  describe("getTenantPlan", () => {
    test("returns plan when tenant found", async () => {
      const empTable = buildTableMock(Promise.resolve({ data: null }));
      const tenantTable = buildTableMock(Promise.resolve({ data: { plan: "free" } }));
      const supabase = createMockSupabase({ employees: empTable, tenants: tenantTable });
      const result = await getTenantPlan(supabase, "t-1");
      expect(result).toBe("free");
    });

    test("returns null when tenant not found", async () => {
      const empTable = buildTableMock(Promise.resolve({ data: null }));
      const tenantTable = buildTableMock(Promise.resolve({ data: null }));
      const supabase = createMockSupabase({ employees: empTable, tenants: tenantTable });
      const result = await getTenantPlan(supabase, "nonexistent");
      expect(result).toBeNull();
    });
  });
});
