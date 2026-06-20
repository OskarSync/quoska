-- Projects, project assignments, and project_id on time_entries
-- Epic 11: Project & Customer Assignment

-- ============================================================
-- Projects table
-- ============================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  customer_name TEXT,
  color TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT projects_name_unique_per_tenant UNIQUE (tenant_id, name)
);

-- ============================================================
-- Project assignments table
-- ============================================================
CREATE TABLE project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT project_assignments_unique UNIQUE (project_id, employee_id)
);

-- ============================================================
-- Add project_id to time_entries
-- ============================================================
ALTER TABLE time_entries ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_projects_tenant ON projects(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_assignments_employee ON project_assignments(employee_id);
CREATE INDEX idx_project_assignments_project ON project_assignments(project_id);
CREATE INDEX idx_time_entries_project ON time_entries(project_id) WHERE project_id IS NOT NULL;

-- ============================================================
-- RLS for projects
-- ============================================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_tenant_isolation" ON projects
  USING (tenant_id = get_jwt_claim('tenant_id')::uuid);

-- ============================================================
-- RLS for project_assignments
-- ============================================================
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignments_tenant_isolation" ON project_assignments
  USING (tenant_id = get_jwt_claim('tenant_id')::uuid);
