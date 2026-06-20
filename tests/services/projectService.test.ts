/**
 * Project Service Tests — Unit tests for Epic 11.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase — only the chainable factory is used in this test file

function chainable() {
  const obj: Record<string, ReturnType<typeof vi.fn>> = {};
  obj.eq = vi.fn().mockReturnValue(obj);
  obj.neq = vi.fn().mockReturnValue(obj);
  obj.is = vi.fn().mockReturnValue(obj);
  obj.limit = vi.fn().mockReturnValue(obj);
  obj.order = vi.fn().mockReturnValue(obj);
  obj.in = vi.fn().mockReturnValue(obj);
  obj.gte = vi.fn().mockReturnValue(obj);
  obj.lte = vi.fn().mockReturnValue(obj);
  obj.single = vi.fn().mockReturnValue(obj);
  obj.select = vi.fn().mockReturnValue(obj);
  obj.insert = vi.fn().mockReturnValue(obj);
  obj.update = vi.fn().mockReturnValue(obj);
  obj.delete = vi.fn().mockReturnValue(obj);
  return obj;
}

function createMockSupabase() {
  const query = chainable();
  const from = vi.fn().mockReturnValue(query);
  return { from, _query: query };
}

// Import after mock setup
vi.mock("@/repos/projectRepo", () => ({
  createProject: vi.fn(),
  getProjectById: vi.fn(),
  listProjects: vi.fn(),
  updateProject: vi.fn(),
  softDeleteProject: vi.fn(),
  projectNameExists: vi.fn(),
  assignEmployeeToProject: vi.fn(),
  unassignEmployeeFromProject: vi.fn(),
  getAssignmentsForEmployee: vi.fn(),
  getAssignmentsForProject: vi.fn(),
  getProjectReportRows: vi.fn(),
  getProjectDetailRows: vi.fn(),
}));

import {
  createProject,
  updateProject,
  deactivateProject,
  listProjectsWithStats,
  assignEmployees,
  unassignEmployee,
  getMyProjects,
  getProjectReport,
} from "@/services/projectService";

import * as repo from "@/repos/projectRepo";

describe("ProjectService", () => {
  const supabase = createMockSupabase() as unknown as Parameters<typeof createProject>[0];
  const tenantId = "tenant-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  describe("createProject", () => {
    it("creates a project when name is unique", async () => {
      vi.mocked(repo.projectNameExists).mockResolvedValue(false);
      vi.mocked(repo.createProject).mockResolvedValue({
        id: "p1", tenant_id: tenantId, name: "Web Redesign",
        customer_name: null, color: null, active: true,
        created_at: "2026-01-01", updated_at: "2026-01-01", deleted_at: null,
      });

      const result = await createProject(supabase, tenantId, { name: "Web Redesign" });
      expect(result.data).not.toBeNull();
      expect(result.data!.name).toBe("Web Redesign");
      expect(repo.createProject).toHaveBeenCalledWith(
        supabase,
        expect.objectContaining({ tenant_id: tenantId, name: "Web Redesign" }),
      );
    });

    it("rejects duplicate name", async () => {
      vi.mocked(repo.projectNameExists).mockResolvedValue(true);

      const result = await createProject(supabase, tenantId, { name: "Existing" });
      expect(result.data).toBeNull();
      expect(result.error).toContain("existiert bereits");
    });

    it("handles repo failure", async () => {
      vi.mocked(repo.projectNameExists).mockResolvedValue(false);
      vi.mocked(repo.createProject).mockResolvedValue(null);

      const result = await createProject(supabase, tenantId, { name: "Test" });
      expect(result.data).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  describe("updateProject", () => {
    it("updates name when new name is unique", async () => {
      vi.mocked(repo.getProjectById).mockResolvedValue({
        id: "p1", tenant_id: tenantId, name: "Old",
        customer_name: null, color: null, active: true,
        created_at: "2026-01-01", updated_at: "2026-01-01", deleted_at: null,
      });
      vi.mocked(repo.projectNameExists).mockResolvedValue(false);
      vi.mocked(repo.updateProject).mockResolvedValue({
        id: "p1", tenant_id: tenantId, name: "New",
        customer_name: null, color: null, active: true,
        created_at: "2026-01-01", updated_at: "2026-01-01", deleted_at: null,
      });

      const result = await updateProject(supabase, tenantId, "p1", { name: "New" });
      expect(result.data!.name).toBe("New");
    });

    it("rejects update for non-existent project", async () => {
      vi.mocked(repo.getProjectById).mockResolvedValue(null);

      const result = await updateProject(supabase, tenantId, "p1", { name: "New" });
      expect(result.error).toContain("nicht gefunden");
    });

    it("allows update without renaming (no duplicate check)", async () => {
      vi.mocked(repo.getProjectById).mockResolvedValue({
        id: "p1", tenant_id: tenantId, name: "Same",
        customer_name: null, color: null, active: true,
        created_at: "2026-01-01", updated_at: "2026-01-01", deleted_at: null,
      });
      vi.mocked(repo.updateProject).mockResolvedValue({
        id: "p1", tenant_id: tenantId, name: "Same",
        customer_name: "Client", color: null, active: true,
        created_at: "2026-01-01", updated_at: "2026-01-01", deleted_at: null,
      });

      const result = await updateProject(supabase, tenantId, "p1", { customer_name: "Client" });
      expect(result.data).not.toBeNull();
      // projectNameExists should NOT have been called since name unchanged
      expect(repo.projectNameExists).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Deactivate
  // ---------------------------------------------------------------------------

  describe("deactivateProject", () => {
    it("soft-deletes an existing project", async () => {
      vi.mocked(repo.getProjectById).mockResolvedValue({
        id: "p1", tenant_id: tenantId, name: "Test",
        customer_name: null, color: null, active: true,
        created_at: "2026-01-01", updated_at: "2026-01-01", deleted_at: null,
      });
      vi.mocked(repo.softDeleteProject).mockResolvedValue(true);

      const result = await deactivateProject(supabase, tenantId, "p1");
      expect(result.data).toBe(true);
    });

    it("rejects for non-existent project", async () => {
      vi.mocked(repo.getProjectById).mockResolvedValue(null);

      const result = await deactivateProject(supabase, tenantId, "missing");
      expect(result.error).toContain("nicht gefunden");
    });
  });

  // ---------------------------------------------------------------------------
  // List
  // ---------------------------------------------------------------------------

  describe("listProjectsWithStats", () => {
    it("returns projects from repo", async () => {
      const mockProjects = [
        { id: "p1", tenant_id: tenantId, name: "A", customer_name: null, color: null, active: true, created_at: "", updated_at: "", deleted_at: null, employee_count: 2 },
      ];
      vi.mocked(repo.listProjects).mockResolvedValue(mockProjects);

      const result = await listProjectsWithStats(supabase, tenantId);
      expect(result.data).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Assignments
  // ---------------------------------------------------------------------------

  describe("assignEmployees", () => {
    it("assigns employees skipping existing ones", async () => {
      vi.mocked(repo.getProjectById).mockResolvedValue({
        id: "p1", tenant_id: tenantId, name: "Test",
        customer_name: null, color: null, active: true,
        created_at: "", updated_at: "", deleted_at: null,
      });
      vi.mocked(repo.getAssignmentsForProject).mockResolvedValue([
        { id: "a1", tenant_id: tenantId, project_id: "p1", employee_id: "emp1", created_at: "", employee: { id: "emp1", first_name: "A", last_name: "B" } },
      ]);
      vi.mocked(repo.assignEmployeeToProject).mockResolvedValue({
        id: "a2", tenant_id: tenantId, project_id: "p1", employee_id: "emp2", created_at: "",
      });

      const result = await assignEmployees(supabase, tenantId, "p1", ["emp1", "emp2"]);
      expect(result.data).toBe(true);
      // Only emp2 should be assigned (emp1 already exists)
      expect(repo.assignEmployeeToProject).toHaveBeenCalledTimes(1);
    });

    it("rejects for non-existent project", async () => {
      vi.mocked(repo.getProjectById).mockResolvedValue(null);

      const result = await assignEmployees(supabase, tenantId, "missing", ["emp1"]);
      expect(result.error).toContain("nicht gefunden");
    });
  });

  describe("unassignEmployee", () => {
    it("unassigns an employee", async () => {
      vi.mocked(repo.unassignEmployeeFromProject).mockResolvedValue(true);

      const result = await unassignEmployee(supabase, tenantId, "p1", "emp1");
      expect(result.data).toBe(true);
    });
  });

  describe("getMyProjects", () => {
    it("returns projects assigned to employee", async () => {
      vi.mocked(repo.getAssignmentsForEmployee).mockResolvedValue([
        {
          id: "a1", tenant_id: tenantId, project_id: "p1", employee_id: "emp1", created_at: "",
          project: { id: "p1", tenant_id: tenantId, name: "Web", color: "#fff", customer_name: null, active: true, created_at: "", updated_at: "", deleted_at: null },
        },
      ]);

      const result = await getMyProjects(supabase, tenantId, "emp1");
      expect(result.data).toHaveLength(1);
      expect(result.data![0].name).toBe("Web");
    });
  });

  // ---------------------------------------------------------------------------
  // Reports
  // ---------------------------------------------------------------------------

  describe("getProjectReport", () => {
    it("returns aggregated rows from repo", async () => {
      const mockRows = [
        { project_id: "p1", project_name: "Web", customer_name: null, total_minutes: 480, entry_count: 5, employee_count: 2 },
        { project_id: null, project_name: "Ohne Projekt", customer_name: null, total_minutes: 120, entry_count: 2, employee_count: 1 },
      ];
      vi.mocked(repo.getProjectReportRows).mockResolvedValue(mockRows);

      const result = await getProjectReport(supabase, tenantId, "2026-01-01", "2026-01-31");
      expect(result.data).toHaveLength(2);
    });
  });
});
