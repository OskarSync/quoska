-- Migration: 010_rls_policies
-- Row-Level Security for tenant isolation (ADR-005) and audit immutability.
-- RLS is the PRIMARY enforcement layer. Application code is secondary.

-- ============================================================
-- Enable RLS on all tenant-scoped tables
-- ============================================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entry_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE correction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
-- public_holidays is read-only reference data, no RLS needed

-- ============================================================
-- Helper: tenant_id from JWT
-- ============================================================
-- auth.jwt()->>'tenant_id' returns the tenant_id claim we set
-- in 011_helpers.sql via the custom claims function.

-- ============================================================
-- Tenants table: admin can only see their own tenant
-- ============================================================

CREATE POLICY "tenants_isolation" ON tenants
  FOR ALL
  USING (id = (auth.jwt()->>'tenant_id')::uuid);

-- ============================================================
-- Employees: tenant-scoped
-- ============================================================

CREATE POLICY "employees_tenant_isolation" ON employees
  FOR ALL
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- ============================================================
-- Time entries: tenant-scoped + employee self-access
-- ============================================================

-- Managers/admins: see all entries in their tenant
CREATE POLICY "time_entries_tenant_read" ON time_entries
  FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- Employees: can insert own entries
CREATE POLICY "time_entries_employee_insert" ON time_entries
  FOR INSERT
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND employee_id = (auth.jwt()->>'employee_id')::uuid
  );

-- Employees: can update own entries (status changes)
-- Managers: can update any entry in tenant (corrections)
CREATE POLICY "time_entries_update" ON time_entries
  FOR UPDATE
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND (
      employee_id = (auth.jwt()->>'employee_id')::uuid
      OR (auth.jwt()->>'role')::text IN ('admin', 'manager')
    )
  );

-- Block hard deletes. Only soft deletes (SET deleted_at) allowed.
CREATE POLICY "time_entries_no_delete" ON time_entries
  FOR DELETE
  USING (false);

-- ============================================================
-- Break sessions: tenant-scoped
-- ============================================================

CREATE POLICY "break_sessions_tenant" ON break_sessions
  FOR ALL
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- ============================================================
-- Audit trail: INSERT-only (Revisionssicherheit)
-- ============================================================

-- Anyone authenticated in the tenant can INSERT audit records
CREATE POLICY "audit_insert" ON time_entry_audit
  FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- Anyone in the tenant can READ audit records
CREATE POLICY "audit_select" ON time_entry_audit
  FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- UPDATE is BLOCKED — audit records are immutable
CREATE POLICY "audit_no_update" ON time_entry_audit
  FOR UPDATE
  USING (false);

-- DELETE is BLOCKED — audit records are immutable
CREATE POLICY "audit_no_delete" ON time_entry_audit
  FOR DELETE
  USING (false);

-- ============================================================
-- Correction requests: tenant-scoped
-- ============================================================

CREATE POLICY "corrections_tenant" ON correction_requests
  FOR ALL
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- ============================================================
-- Notifications: employees see only their own
-- ============================================================

CREATE POLICY "notifications_employee" ON notifications
  FOR SELECT
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND employee_id = (auth.jwt()->>'employee_id')::uuid
  );

CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE
  USING (
    employee_id = (auth.jwt()->>'employee_id')::uuid
  );

-- ============================================================
-- Subscription events: tenant-scoped, admin only
-- ============================================================

CREATE POLICY "subscription_events_tenant" ON subscription_events
  FOR ALL
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND (auth.jwt()->>'role')::text = 'admin'
  );
