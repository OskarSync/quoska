-- Migration: 006_correction_requests
-- Employees request corrections; managers approve or reject.
-- Approved corrections are applied via the audit-trail flow (Story 4.1).

CREATE TABLE correction_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
  proposed_change JSONB NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Find pending corrections for a manager dashboard
CREATE INDEX idx_correction_requests_tenant_status
  ON correction_requests (tenant_id, status)
  WHERE status = 'pending';

-- Find an employee's own correction requests
CREATE INDEX idx_correction_requests_employee
  ON correction_requests (employee_id);

COMMENT ON TABLE correction_requests IS 'Employee correction requests. Manager approves/rejects via audit trail flow.';
COMMENT ON COLUMN correction_requests.proposed_change IS 'JSON describing the requested change, e.g. {"field": "clock_out", "value": "17:00"}';
