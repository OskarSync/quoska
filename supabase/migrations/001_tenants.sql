-- Migration: 001_tenants
-- Creates the tenants table. Each tenant represents a registered company.
-- All other tenant-scoped tables reference this via tenant_id.

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'team', 'pro')),
  stripe_customer_id TEXT,
  bundesland TEXT,
  setup_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for looking up tenants by Stripe customer (webhook processing)
CREATE INDEX idx_tenants_stripe_customer
  ON tenants (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

COMMENT ON TABLE tenants IS 'Registered companies. Each tenant is an isolated workspace.';
COMMENT ON COLUMN tenants.plan IS 'Subscription plan: free (3 employees), team (unlimited), pro (future).';
COMMENT ON COLUMN tenants.bundesland IS 'Federal state for public holiday calculation (Feiertage).';
