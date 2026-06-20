-- Sick entries table (Epic 10)
CREATE TABLE sick_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  start_date DATE NOT NULL,
  end_date DATE,
  work_days_count INTEGER,
  au_certificate_url TEXT,
  au_uploaded_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sick_entries_tenant ON sick_entries(tenant_id);
CREATE INDEX idx_sick_entries_employee ON sick_entries(employee_id);
CREATE INDEX idx_sick_entries_dates ON sick_entries(tenant_id, start_date, end_date);
