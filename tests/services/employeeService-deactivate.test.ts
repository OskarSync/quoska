/**
 * Unit tests for employeeService — deactivateEmployee.
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

function createAdminMock() {
  return {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }),
    auth: {
      admin: {
        updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
      },
    },
    rpc: vi.fn().mockResolvedValue({ error: null }),
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

function createRegularMock() {
  return { from: vi.fn(), auth: { getUser: vi.fn() } } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

describe("deactivateEmployee", () => {
  test("prevents self-deactivation", async () => {
    const { deactivateEmployee } = await import("@/services/employeeService");
    const result = await deactivateEmployee(
      createRegularMock(), createAdminMock(), "t-1", "emp-self", "emp-self",
    );
    expect(result.data).toBeNull();
    expect(result.error).toContain("selbst");
  });

  test("returns error when employee not found", async () => {
    const { getEmployeeById } = await import("@/repos/employeeRepo");
    const { deactivateEmployee } = await import("@/services/employeeService");
    vi.mocked(getEmployeeById).mockResolvedValueOnce(null);
    const result = await deactivateEmployee(
      createRegularMock(), createAdminMock(), "t-1", "nonexistent", "emp-self",
    );
    expect(result.data).toBeNull();
    expect(result.error).toContain("nicht gefunden");
  });

  test("returns error when already deactivated", async () => {
    const { getEmployeeById } = await import("@/repos/employeeRepo");
    const { deactivateEmployee } = await import("@/services/employeeService");
    vi.mocked(getEmployeeById).mockResolvedValueOnce({
      ...sampleEmployee,
      deleted_at: "2026-05-01T00:00:00Z",
    });
    const result = await deactivateEmployee(
      createRegularMock(), createAdminMock(), "t-1", "emp-1", "emp-self",
    );
    expect(result.data).toBeNull();
    expect(result.error).toContain("bereits deaktiviert");
  });

  test("soft-deletes and bans auth user on success", async () => {
    const { getEmployeeById } = await import("@/repos/employeeRepo");
    const { deactivateEmployee } = await import("@/services/employeeService");
    vi.mocked(getEmployeeById).mockResolvedValueOnce(sampleEmployee);
    const admin = createAdminMock();
    const result = await deactivateEmployee(
      createRegularMock(), admin, "t-1", "emp-1", "emp-admin",
    );
    expect(result.data).not.toBeNull();
    expect(result.data!.id).toBe("emp-1");
    expect(admin.auth.admin.updateUserById).toHaveBeenCalledWith("u-1", {
      ban_duration: "876000h",
    });
  });
});
