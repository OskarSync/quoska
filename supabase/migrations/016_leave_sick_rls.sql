-- RLS policies for leave_requests, leave_entitlements, sick_entries
-- Uses get_jwt_claim() helper from migration 012 (JWT claims are under app_metadata)
-- Storage bucket for AU certificates

-- RLS for leave_requests
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leave_tenant_isolation" ON leave_requests
  USING (tenant_id = get_jwt_claim('tenant_id')::uuid);

CREATE POLICY "leave_employee_self" ON leave_requests
  FOR SELECT USING (
    employee_id = get_jwt_claim('employee_id')::uuid
    OR get_jwt_claim('role') IN ('admin', 'manager')
  );

-- RLS for leave_entitlements
ALTER TABLE leave_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entitlement_tenant_isolation" ON leave_entitlements
  USING (tenant_id = get_jwt_claim('tenant_id')::uuid);

-- RLS for sick_entries
ALTER TABLE sick_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sick_tenant_isolation" ON sick_entries
  USING (tenant_id = get_jwt_claim('tenant_id')::uuid);

CREATE POLICY "sick_employee_self" ON sick_entries
  FOR SELECT USING (
    employee_id = get_jwt_claim('employee_id')::uuid
    OR get_jwt_claim('role') IN ('admin', 'manager')
  );

-- Supabase Storage bucket for AU certificates
INSERT INTO storage.buckets (id, name, public)
VALUES ('au-certificates', 'au-certificates', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "au_tenant_access" ON storage.objects
  FOR ALL USING (
    bucket_id = 'au-certificates'
    AND get_jwt_claim('tenant_id') IS NOT NULL
  );
