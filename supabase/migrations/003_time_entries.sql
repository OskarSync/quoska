-- Migration: 003_time_entries
-- Core time tracking table. All timestamps server-generated (ADR-001).
-- Soft deletes only (deleted_at). Partial unique index enforces one active
-- entry per employee (FR-3: prevent concurrent time entries).

CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out TIMESTAMPTZ,
  break_minutes INTEGER NOT NULL DEFAULT 0
    CHECK (break_minutes >= 0),
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'paused', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Compound unique for FK reference from break_sessions (tenant_id, id)
CREATE UNIQUE INDEX idx_time_entries_tenant_id ON time_entries (tenant_id, id);

-- Prevent concurrent active entries per employee (FR-3)
CREATE UNIQUE INDEX idx_time_entries_active_per_employee
  ON time_entries (employee_id)
  WHERE status IN ('running', 'paused') AND deleted_at IS NULL;

-- Lookup entries by employee and date range
CREATE INDEX idx_time_entries_employee_date
  ON time_entries (employee_id, date)
  WHERE deleted_at IS NULL;

-- Lookup entries by tenant for manager queries
CREATE INDEX idx_time_entries_tenant_date
  ON time_entries (tenant_id, date)
  WHERE deleted_at IS NULL;

-- FK to ensure employee belongs to same tenant
-- (application layer also enforces, this is belt-and-suspenders)
ALTER TABLE time_entries
  ADD CONSTRAINT fk_time_entries_employee_tenant
  FOREIGN KEY (tenant_id, employee_id)
  REFERENCES employees (tenant_id, id)
  ON DELETE CASCADE;

COMMENT ON TABLE time_entries IS 'Time tracking entries. Server timestamps only (ADR-001). Soft-deleted, never hard-deleted.';
COMMENT ON COLUMN time_entries.clock_in IS 'Server-generated timestamp when employee clocks in. Never client-provided.';
COMMENT ON COLUMN time_entries.clock_out IS 'Server-generated timestamp when employee clocks out. NULL while running.';
COMMENT ON COLUMN time_entries.break_minutes IS 'Accumulated break time in minutes. Sum of all completed break_sessions.';
COMMENT ON COLUMN time_entries.date IS 'The calendar date of the shift (clock_in date, even if shift crosses midnight).';
