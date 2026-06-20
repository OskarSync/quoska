/**
 * Unit tests for employeeService — invite, update, list, plan limits.
 */

import { describe, test, expect, vi } from "vitest";
import type { Employee } from "@/types/database";

vi.mock("@/repos/employeeRepo", () => ({
  getEmployeesByTenant: vi.fn(),
  getDeactivatedEmployees: vi.fn(),
  getEmployeeById: vi.fn(),
  getEmployeeByEmail: vi.fn(),
  countActiveEmployees: vi.fn(),
  getTenantPlan: vi.fn(),
}));

vi.mock("@/config/server/timestamps", () => ({
  getNowIso: vi.fn().mockReturnValue("2026-06-02T12:00:00.000Z"),
}));

const sampleEmployee: Employee = {
  id: "emp-1", tenant_id: "t-1", user_id: "u-1",
  first_name: "Anna", last_name: "Müller", email: "anna@example.com",
  role: "employee", target_hours_week: 40, bundesland: "berlin",
  invitation_token: null, invited_at: null,
  created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-01T00:00:00Z",
  deleted_at: null,
};

function createAdminMock(overrides: Record<string, unknown> = {}) {
  return {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: sampleEmployee, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...sampleEmployee, role: "manager" }, error: null,
              }),
            }),
          }),
        }),
      }),
    }),
    auth: {
      admin: {
        inviteUserByEmail: vi.fn().mockResolvedValue({
          data: { user: { id: "u-new" } }, error: null,
        }),
        updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
      },
    },
    rpc: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

function createRegularMock() {
  return { from: vi.fn(), auth: { getUser: vi.fn() } } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

describe("employeeService", () => {
  describe("inviteEmployee", () => {
    test("rejects when free plan limit reached", async () => {
      const { getTenantPlan, countActiveEmployees } = await import("@/repos/employeeRepo");
      const { inviteEmployee } = await import("@/services/employeeService");
      vi.mocked(getTenantPlan).mockResolvedValueOnce("free");
      vi.mocked(countActiveEmployees).mockResolvedValueOnce(3);
      const result = await inviteEmployee(createRegularMock(), createAdminMock(), "t-1", {
        firstName: "Bob", lastName: "Test", email: "bob@test.com", role: "employee",
      });
      expect(result.data).toBeNull();
      expect(result.error).toContain("Maximal 3");
    });

    test("allows invite when under free plan limit", async () => {
      const { getTenantPlan, countActiveEmployees, getEmployeeByEmail } = await import("@/repos/employeeRepo");
      const { inviteEmployee } = await import("@/services/employeeService");
      vi.mocked(getTenantPlan).mockResolvedValueOnce("free");
      vi.mocked(countActiveEmployees).mockResolvedValueOnce(1);
      vi.mocked(getEmployeeByEmail).mockResolvedValueOnce(null);
      const result = await inviteEmployee(createRegularMock(), createAdminMock(), "t-1", {
        firstName: "Bob", lastName: "Test", email: "bob@test.com", role: "employee",
      });
      expect(result.data).not.toBeNull();
    });

    test("allows invite on team plan regardless of count", async () => {
      const { getTenantPlan, getEmployeeByEmail } = await import("@/repos/employeeRepo");
      const { inviteEmployee } = await import("@/services/employeeService");
      vi.mocked(getTenantPlan).mockResolvedValueOnce("team");
      vi.mocked(getEmployeeByEmail).mockResolvedValueOnce(null);
      const result = await inviteEmployee(createRegularMock(), createAdminMock(), "t-1", {
        firstName: "Bob", lastName: "Test", email: "bob@test.com", role: "employee",
      });
      expect(result.data).not.toBeNull();
    });

    test("rejects duplicate email within same tenant", async () => {
      const { getTenantPlan, countActiveEmployees, getEmployeeByEmail } = await import("@/repos/employeeRepo");
      const { inviteEmployee } = await import("@/services/employeeService");
      vi.mocked(getTenantPlan).mockResolvedValueOnce("free");
      vi.mocked(countActiveEmployees).mockResolvedValueOnce(1);
      vi.mocked(getEmployeeByEmail).mockResolvedValueOnce(sampleEmployee);
      const result = await inviteEmployee(createRegularMock(), createAdminMock(), "t-1", {
        firstName: "Anna", lastName: "Dup", email: "anna@example.com", role: "employee",
      });
      expect(result.data).toBeNull();
      expect(result.error).toContain("existiert bereits");
    });

    test("handles auth invite failure gracefully", async () => {
      const { getTenantPlan, countActiveEmployees, getEmployeeByEmail } = await import("@/repos/employeeRepo");
      const { inviteEmployee } = await import("@/services/employeeService");
      vi.mocked(getTenantPlan).mockResolvedValueOnce("free");
      vi.mocked(countActiveEmployees).mockResolvedValueOnce(1);
      vi.mocked(getEmployeeByEmail).mockResolvedValueOnce(null);
      const admin = createAdminMock({
        auth: {
          admin: {
            inviteUserByEmail: vi.fn().mockResolvedValue({
              data: { user: null }, error: { message: "SMTP error" },
            }),
            updateUserById: vi.fn(),
          },
        },
      });
      const result = await inviteEmployee(createRegularMock(), admin, "t-1", {
        firstName: "Bob", lastName: "Test", email: "bob@test.com", role: "employee",
      });
      expect(result.data).toBeNull();
      expect(result.error).toContain("Einladen");
    });
  });

  describe("updateEmployee", () => {
    test("returns error when employee not found", async () => {
      const { getEmployeeById } = await import("@/repos/employeeRepo");
      const { updateEmployee } = await import("@/services/employeeService");
      vi.mocked(getEmployeeById).mockResolvedValueOnce(null);
      const result = await updateEmployee(createRegularMock(), createAdminMock(), "t-1", "nonexistent", { first_name: "New" });
      expect(result.data).toBeNull();
      expect(result.error).toContain("nicht gefunden");
    });

    test("refreshes JWT claims when role changes", async () => {
      const { getEmployeeById } = await import("@/repos/employeeRepo");
      const { updateEmployee } = await import("@/services/employeeService");
      vi.mocked(getEmployeeById).mockResolvedValueOnce(sampleEmployee);
      const admin = createAdminMock();
      await updateEmployee(createRegularMock(), admin, "t-1", "emp-1", { role: "manager" });
      expect(admin.rpc).toHaveBeenCalledWith("set_employee_claims", { user_uuid: "u-1" });
    });

    test("does not refresh JWT claims when role unchanged", async () => {
      const { getEmployeeById } = await import("@/repos/employeeRepo");
      const { updateEmployee } = await import("@/services/employeeService");
      vi.mocked(getEmployeeById).mockResolvedValueOnce(sampleEmployee);
      const admin = createAdminMock();
      await updateEmployee(createRegularMock(), admin, "t-1", "emp-1", { first_name: "Updated" });
      expect(admin.rpc).not.toHaveBeenCalledWith("set_employee_claims", expect.anything());
    });
  });

  describe("listEmployees", () => {
    test("returns active and deactivated employees", async () => {
      const { getEmployeesByTenant, getDeactivatedEmployees } = await import("@/repos/employeeRepo");
      const { listEmployees } = await import("@/services/employeeService");
      vi.mocked(getEmployeesByTenant).mockResolvedValueOnce([sampleEmployee]);
      vi.mocked(getDeactivatedEmployees).mockResolvedValueOnce([]);
      const result = await listEmployees(createRegularMock(), "t-1");
      expect(result.data!.active).toHaveLength(1);
      expect(result.data!.deactivated).toHaveLength(0);
    });
  });

  describe("getPlanLimitStatus", () => {
    test("returns correct limit for free plan", async () => {
      const { getTenantPlan, countActiveEmployees } = await import("@/repos/employeeRepo");
      const { getPlanLimitStatus } = await import("@/services/employeeService");
      vi.mocked(getTenantPlan).mockResolvedValueOnce("free");
      vi.mocked(countActiveEmployees).mockResolvedValueOnce(2);
      const result = await getPlanLimitStatus(createRegularMock(), "t-1");
      expect(result.data!.limit).toBe(3);
      expect(result.data!.canAddMore).toBe(true);
    });

    test("returns canAddMore=false when at limit", async () => {
      const { getTenantPlan, countActiveEmployees } = await import("@/repos/employeeRepo");
      const { getPlanLimitStatus } = await import("@/services/employeeService");
      vi.mocked(getTenantPlan).mockResolvedValueOnce("free");
      vi.mocked(countActiveEmployees).mockResolvedValueOnce(3);
      const result = await getPlanLimitStatus(createRegularMock(), "t-1");
      expect(result.data!.canAddMore).toBe(false);
    });

    test("returns limit 10 for team plan", async () => {
      const { getTenantPlan, countActiveEmployees } = await import("@/repos/employeeRepo");
      const { getPlanLimitStatus } = await import("@/services/employeeService");
      vi.mocked(getTenantPlan).mockResolvedValueOnce("team");
      vi.mocked(countActiveEmployees).mockResolvedValueOnce(10);
      const result = await getPlanLimitStatus(createRegularMock(), "t-1");
      expect(result.data!.limit).toBe(10);
      expect(result.data!.canAddMore).toBe(false);
    });

    test("returns no limit for pro plan", async () => {
      const { getTenantPlan, countActiveEmployees } = await import("@/repos/employeeRepo");
      const { getPlanLimitStatus } = await import("@/services/employeeService");
      vi.mocked(getTenantPlan).mockResolvedValueOnce("pro");
      vi.mocked(countActiveEmployees).mockResolvedValueOnce(10);
      const result = await getPlanLimitStatus(createRegularMock(), "t-1");
      expect(result.data!.limit).toBeNull();
      expect(result.data!.canAddMore).toBe(true);
    });
  });
});
