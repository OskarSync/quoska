-- Leave entitlements table (Epic 9)
CREATE TABLE leave_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  year INTEGER NOT NULL,
  total_days INTEGER NOT NULL DEFAULT 20,
  carried_over INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, year)
);

CREATE INDEX idx_leave_entitlements_employee_year ON leave_entitlements(employee_id, year);
