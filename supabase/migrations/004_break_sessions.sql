-- Migration: 004_break_sessions
-- Individual break periods within a time entry.
-- Each break is a separate row. time_entries.break_minutes is the
-- accumulated sum of all completed breaks for that entry.

CREATE TABLE break_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
  break_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  break_end TIMESTAMPTZ,
  duration_minutes INTEGER
    CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Find active (open) breaks for a time entry
CREATE INDEX idx_break_sessions_time_entry
  ON break_sessions (time_entry_id);

-- Ensure break belongs to same tenant as its time entry
ALTER TABLE break_sessions
  ADD CONSTRAINT fk_break_sessions_tenant
  FOREIGN KEY (tenant_id, time_entry_id)
  REFERENCES time_entries (tenant_id, id)
  ON DELETE CASCADE;

COMMENT ON TABLE break_sessions IS 'Individual break periods within a time entry. §4 ArbZG: min 15min per block.';
COMMENT ON COLUMN break_sessions.duration_minutes IS 'Calculated from break_end - break_start. NULL while break is ongoing.';
