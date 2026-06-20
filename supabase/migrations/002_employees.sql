-- Migration: 002_employees
-- Employees belong to a tenant and are linked to a Supabase Auth user.
-- Soft deletes via deleted_at. Partial unique index prevents duplicate
-- active emails within a tenant.

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee'
    CHECK (role IN ('admin', 'manager', 'employee')),
  target_hours_week INTEGER NOT NULL DEFAULT 40
    CHECK (target_hours_week > 0 AND target_hours_week <= 48),
  bundesland TEXT,
  invitation_token TEXT,
  invited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Compound unique for FK reference from time_entries (tenant_id, id)
-- Logically unique since id is already PK, but needed for compound FK.
CREATE UNIQUE INDEX idx_employees_tenant_id ON employees (tenant_id, id);

-- One active employee per (tenant, email). Deleted employees allow re-invite.
CREATE UNIQUE INDEX idx_employees_tenant_email_active
  ON employees (tenant_id, email)
  WHERE deleted_at IS NULL;

-- Fast lookup: find active employees for a tenant
CREATE INDEX idx_employees_tenant_active
  ON employees (tenant_id)
  WHERE deleted_at IS NULL;

-- Link employee to Supabase Auth user
CREATE INDEX idx_employees_user_id
  ON employees (user_id);

COMMENT ON TABLE employees IS 'Company employees linked to Supabase Auth users.';
COMMENT ON COLUMN employees.role IS 'admin: full access. manager: view/edit all entries. employee: own entries only.';
COMMENT ON COLUMN employees.target_hours_week IS 'Weekly target hours for overtime calculation. Default 40, max 48 (ArbZG).';
COMMENT ON COLUMN employees.deleted_at IS 'Soft delete timestamp. NULL = active. Set by deactivation, never hard-deleted.';
