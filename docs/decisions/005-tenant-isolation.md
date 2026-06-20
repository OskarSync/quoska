# ADR-005: Tenant Isolation via Row-Level Security

**Date:** 2026-05-12  
**Status:** Accepted  
**Decision:** Multi-tenant data isolation using PostgreSQL Row-Level Security (RLS) with `tenant_id` on every table. Not separate schemas or databases per tenant.

## Context

Quoska is multi-tenant SaaS. Each company (tenant) must only see its own data. Data leaks between tenants are both a DSGVO violation and a business-critical failure.

## Decision

- Every table includes a `tenant_id` column (UUID, FK to `tenants`)
- PostgreSQL RLS policies enforce: every query automatically filters by `tenant_id` from the JWT
- Application code MUST include `tenant_id` in all queries (belt and suspenders)
- Supabase RLS policies are the primary enforcement layer
- Application-level checks are the secondary layer

### RLS Policy Pattern

```sql
CREATE POLICY "tenant_isolation" ON time_entries
  USING (tenant_id = auth.jwt()->>'tenant_id');
```

### Application Pattern

```typescript
// ALWAYS include tenant_id
const { data } = await supabase
  .from('time_entries')
  .select('*')
  .eq('tenant_id', tenantId)  // NEVER omit this
  .eq('employee_id', employeeId);
```

## Consequences

**Positive:**
- Database-level guarantee against cross-tenant leaks
- Simple schema — one set of tables for all tenants
- Scales to thousands of tenants on single Postgres instance
- DSGVO compliance by design

**Negative:**
- Must be careful with migrations (all tenants share schema)
- Need to ensure `tenant_id` is always set (enforced by DB NOT NULL + app validation)
- RLS adds ~5-10% query overhead (acceptable)

## Alternatives Considered

1. **Schema-per-tenant** — rejected: migration complexity, connection pool exhaustion
2. **Database-per-tenant** — rejected: cost, operational overhead
3. **Application-only isolation** — rejected: single bug = data leak
