-- Migration: 011_helpers
-- Helper functions: auto-update triggers, JWT custom claims.

-- ============================================================
-- Auto-update trigger for updated_at columns
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER set_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_break_sessions_updated_at
  BEFORE UPDATE ON break_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_correction_requests_updated_at
  BEFORE UPDATE ON correction_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- JWT custom claims: tenant_id, employee_id, role
-- ============================================================
-- When a user registers, the auth.users.raw_app_meta_data is
-- populated with these claims so they appear in auth.jwt().
-- This function retrieves them from the employees table.

CREATE OR REPLACE FUNCTION get_employee_claims(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  emp RECORD;
BEGIN
  SELECT
    e.tenant_id::text,
    e.id::text,
    e.role
  INTO emp
  FROM employees e
  WHERE e.user_id = user_uuid
    AND e.deleted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN '{}'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'tenant_id', emp.tenant_id,
    'employee_id', emp.id,
    'role', emp.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Function to set custom claims on a user
-- Called after employee creation (registration / invitation)
-- ============================================================

CREATE OR REPLACE FUNCTION set_employee_claims(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  claims JSONB;
BEGIN
  claims := get_employee_claims(user_uuid);

  UPDATE auth.users
  SET
    raw_app_meta_data =
      COALESCE(raw_app_meta_data, '{}'::jsonb) || claims
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Trigger: auto-set claims when employee is inserted
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_employee()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM set_employee_claims(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_employee_created
  AFTER INSERT ON employees
  FOR EACH ROW EXECUTE FUNCTION handle_new_employee();
