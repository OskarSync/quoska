-- Leave requests table (Epic 9)
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  type TEXT NOT NULL CHECK (type IN ('urlaub', 'sonderurlaub', 'unbezahlt')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  work_days_count INTEGER NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by UUID REFERENCES employees(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_leave_requests_tenant ON leave_requests(tenant_id);
CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(tenant_id, status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(tenant_id, start_date, end_date);
