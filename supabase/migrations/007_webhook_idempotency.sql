-- Migration 007: Webhook idempotency table
-- Issue #7: Prevent duplicate processing of Stripe events

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing', -- processing | succeeded | failed
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at
  ON stripe_webhook_events (processed_at);

-- RLS: only service_role can access
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies = no access for authenticated/anon, only service_role (bypasses RLS)
