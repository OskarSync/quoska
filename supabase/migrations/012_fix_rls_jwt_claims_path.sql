-- Migration: 012_fix_rls_jwt_claims_path
-- Fix RLS policies: JWT custom claims are nested inside app_metadata,
-- not at the top level of the JWT payload.
--
-- Before: auth.jwt()->>'tenant_id'  → NULL (wrong path)
-- After:  auth.jwt()->'app_metadata'->>'tenant_id'  → correct value
--
-- This fixes the clock in/out, break tracking, and all tenant-scoped queries
-- failing with "new row violates row-level security policy" (42501).

-- Helper function for cleaner RLS expressions
CREATE OR REPLACE FUNCTION get_jwt_claim(claim_name TEXT)
RETURNS TEXT AS $$
  SELECT auth.jwt()->'app_metadata'->>claim_name;
$$ LANGUAGE SQL STABLE;

-- ============================================================
-- Drop ALL existing policies (they all use the wrong path)
-- ============================================================

-- Tenants
DROP POLICY IF EXISTS "tenants_isolation" ON tenants;

-- Employees
DROP POLICY IF EXISTS "employees_tenant_isolation" ON employees;

-- Time entries
DROP POLICY IF EXISTS "time_entries_tenant_read" ON time_entries;
DROP POLICY IF EXISTS "time_entries_employee_insert" ON time_entries;
DROP POLICY IF EXISTS "time_entries_update" ON time_entries;
DROP POLICY IF EXISTS "time_entries_no_delete" ON time_entries;

-- Break sessions
DROP POLICY IF EXISTS "break_sessions_tenant" ON break_sessions;

-- Audit trail
DROP POLICY IF EXISTS "audit_insert" ON time_entry_audit;
DROP POLICY IF EXISTS "audit_select" ON time_entry_audit;
DROP POLICY IF EXISTS "audit_no_update" ON time_entry_audit;
DROP POLICY IF EXISTS "audit_no_delete" ON time_entry_audit;

-- Correction requests
DROP POLICY IF EXISTS "corrections_tenant" ON correction_requests;

-- Notifications
DROP POLICY IF EXISTS "notifications_employee" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;

-- Subscription events
DROP POLICY IF EXISTS "subscription_events_tenant" ON subscription_events;

-- ============================================================
-- Recreate all policies with correct JWT path
-- ============================================================

-- Tenants: admin can only see their own tenant
CREATE POLICY "tenants_isolation" ON tenants
  FOR ALL
  USING (id = get_jwt_claim('tenant_id')::uuid);

-- Employees: tenant-scoped
CREATE POLICY "employees_tenant_isolation" ON employees
  FOR ALL
  USING (tenant_id = get_jwt_claim('tenant_id')::uuid);

-- Time entries: tenant-scoped + employee self-access

-- All in tenant can read
CREATE POLICY "time_entries_tenant_read" ON time_entries
  FOR SELECT
  USING (tenant_id = get_jwt_claim('tenant_id')::uuid);

-- Employees: can insert own entries
CREATE POLICY "time_entries_employee_insert" ON time_entries
  FOR INSERT
  WITH CHECK (
    tenant_id = get_jwt_claim('tenant_id')::uuid
    AND employee_id = get_jwt_claim('employee_id')::uuid
  );

-- Employees: can update own entries (status changes)
-- Managers/admins: can update any entry in tenant (corrections)
CREATE POLICY "time_entries_update" ON time_entries
  FOR UPDATE
  USING (
    tenant_id = get_jwt_claim('tenant_id')::uuid
    AND (
      employee_id = get_jwt_claim('employee_id')::uuid
      OR get_jwt_claim('role') IN ('admin', 'manager')
    )
  );

-- Block hard deletes. Only soft deletes (SET deleted_at) allowed.
CREATE POLICY "time_entries_no_delete" ON time_entries
  FOR DELETE
  USING (false);

-- Break sessions: tenant-scoped
CREATE POLICY "break_sessions_tenant" ON break_sessions
  FOR ALL
  USING (tenant_id = get_jwt_claim('tenant_id')::uuid);

-- Audit trail: INSERT-only (Revisionssicherheit)
CREATE POLICY "audit_insert" ON time_entry_audit
  FOR INSERT
  WITH CHECK (tenant_id = get_jwt_claim('tenant_id')::uuid);

CREATE POLICY "audit_select" ON time_entry_audit
  FOR SELECT
  USING (tenant_id = get_jwt_claim('tenant_id')::uuid);

-- UPDATE is BLOCKED — audit records are immutable
CREATE POLICY "audit_no_update" ON time_entry_audit
  FOR UPDATE
  USING (false);

-- DELETE is BLOCKED — audit records are immutable
CREATE POLICY "audit_no_delete" ON time_entry_audit
  FOR DELETE
  USING (false);

-- Correction requests: tenant-scoped
CREATE POLICY "corrections_tenant" ON correction_requests
  FOR ALL
  USING (tenant_id = get_jwt_claim('tenant_id')::uuid);

-- Notifications: employees see only their own
CREATE POLICY "notifications_employee" ON notifications
  FOR SELECT
  USING (
    tenant_id = get_jwt_claim('tenant_id')::uuid
    AND employee_id = get_jwt_claim('employee_id')::uuid
  );

CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT
  WITH CHECK (tenant_id = get_jwt_claim('tenant_id')::uuid);

CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE
  USING (
    employee_id = get_jwt_claim('employee_id')::uuid
  );

-- Subscription events: tenant-scoped, admin only
CREATE POLICY "subscription_events_tenant" ON subscription_events
  FOR ALL
  USING (
    tenant_id = get_jwt_claim('tenant_id')::uuid
    AND get_jwt_claim('role') = 'admin'
  );
