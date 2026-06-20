-- Migration: 018_add_business_plan
--
-- Adds the 'business' plan tier (€59/month, up to 50 employees) between team
-- and pro. Option C tiered flatrate pricing.
--
-- The plan column is TEXT with a CHECK constraint; we swap the constraint to
-- admit the new value. Existing tenants keep their current plan (none are
-- 'business' yet).

ALTER TABLE tenants DROP CONSTRAINT tenants_plan_check;
ALTER TABLE tenants ADD CONSTRAINT tenants_plan_check
  CHECK (plan IN ('free', 'team', 'business', 'pro'));

COMMENT ON COLUMN tenants.plan IS
  'Subscription plan: free (≤3), team (≤10, €9/mo), business (≤50, €59/mo), pro (unlimited, €99/mo).';
