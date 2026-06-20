-- Migration: 009_subscription_events
-- Stripe webhook event log. Used for idempotent webhook processing.
-- Each event is stored once; duplicate deliveries are detected via stripe_event_id.

CREATE TABLE subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Find unprocessed events (for retry logic)
CREATE INDEX idx_subscription_events_unprocessed
  ON subscription_events (created_at)
  WHERE processed = false;

COMMENT ON TABLE subscription_events IS 'Stripe webhook log. stripe_event_id UNIQUE ensures idempotent processing.';
