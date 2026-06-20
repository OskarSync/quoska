-- Migration: 005_time_entry_audit
-- Immutable audit trail. INSERT only — UPDATE and DELETE are blocked by RLS
-- policies (see migration 010). This is a legal requirement (Revisionssicherheit).

CREATE TABLE time_entry_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL,
  action TEXT NOT NULL
    CHECK (action IN ('create', 'update', 'delete', 'pause', 'resume')),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Find audit records for a specific time entry (chronological)
CREATE INDEX idx_audit_time_entry
  ON time_entry_audit (time_entry_id, changed_at);

-- Find all changes by a specific user
CREATE INDEX idx_audit_changed_by
  ON time_entry_audit (changed_by);

-- Find audit records within a tenant (for export/DSGVO)
CREATE INDEX idx_audit_tenant
  ON time_entry_audit (tenant_id, changed_at);

COMMENT ON TABLE time_entry_audit IS 'Immutable audit trail. INSERT only. Every mutation on time_entries must log here.';
COMMENT ON COLUMN time_entry_audit.action IS 'Type of mutation: create, update (manager edit), delete (soft), pause, resume.';
COMMENT ON COLUMN time_entry_audit.changed_by IS 'employee_id of the person who made the change.';
COMMENT ON COLUMN time_entry_audit.reason IS 'Mandatory for manager edits. Min 5 characters enforced by service layer.';
