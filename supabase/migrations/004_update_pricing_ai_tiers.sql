-- ===========================================
-- Migration 004: AI Tier Pricing & Credits
-- ===========================================
-- Introduces AI-based subscription tiers (ai_lite, ai_pro),
-- credit tracking on users, AI credit packages table,
-- and AI usage logging with RLS policies.

-- ===========================================
-- ENUM: Add AI subscription tiers
-- ===========================================

-- Add new values to the existing subscription_tier enum.
-- IF NOT EXISTS is supported in PostgreSQL 9.6+.
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'ai_lite';
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'ai_pro';

-- ===========================================
-- USERS TABLE: Add AI credit columns
-- ===========================================

-- Track remaining AI credits for the current billing period.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ai_credits_remaining INTEGER DEFAULT 5;

-- Track when the credits were last reset (used by trigger below).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ai_credits_reset_at TIMESTAMPTZ DEFAULT NOW();

-- ===========================================
-- SUBSCRIPTION PLANS: Update existing plans
-- ===========================================

-- Update free plan to reflect new AI-inclusive positioning.
UPDATE public.subscription_plans
SET
  name          = '無料',
  price_monthly = 0,
  price_yearly  = 0,
  features      = '["基本編集機能", "ブラウザ内処理", "AI機能月5回お試し"]'::jsonb,
  limits        = '{"aiCreditsMonthly": 5}'::jsonb,
  is_active     = TRUE
WHERE tier = 'free';

-- Deactivate the legacy pro plan; replaced by ai_lite / ai_pro.
UPDATE public.subscription_plans
SET is_active = FALSE
WHERE tier = 'pro';

-- Insert AI Lite plan (skip if it already exists).
INSERT INTO public.subscription_plans
  (name, tier, price_monthly, price_yearly, features, limits, is_active)
VALUES (
  'AI Lite',
  'ai_lite',
  480,
  3980,
  '["基本編集機能", "AI機能月100回", "標準サポート"]'::jsonb,
  '{"aiCreditsMonthly": 100, "maxFileSizeMb": 2048}'::jsonb,
  TRUE
)
ON CONFLICT (tier) DO NOTHING;

-- Insert AI Pro plan (skip if it already exists).
INSERT INTO public.subscription_plans
  (name, tier, price_monthly, price_yearly, features, limits, is_active)
VALUES (
  'AI Pro',
  'ai_pro',
  980,
  7980,
  '["基本編集機能", "AI機能月500回", "優先サポート", "HD書き出し"]'::jsonb,
  '{"aiCreditsMonthly": 500, "maxFileSizeMb": 4096}'::jsonb,
  TRUE
)
ON CONFLICT (tier) DO NOTHING;

-- ===========================================
-- TABLE: ai_credit_packages
-- ===========================================
-- Stores purchasable one-time credit packs shown on the pricing page.
-- credits = -1 denotes unlimited (lifetime) access.

CREATE TABLE IF NOT EXISTS public.ai_credit_packages (
  id             UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  name           TEXT        NOT NULL UNIQUE,
  credits        INTEGER     NOT NULL,            -- -1 = unlimited
  price_jpy      INTEGER     NOT NULL,
  stripe_price_id TEXT,
  is_active      BOOLEAN     DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the standard credit packages.
-- ON CONFLICT on name keeps the operation idempotent on re-runs.
INSERT INTO public.ai_credit_packages (name, credits, price_jpy)
VALUES
  ('Pack S',    200,  1980),
  ('Pack M',    600,  4980),
  ('Pack L',   1500,  9800),
  ('Lifetime',   -1, 14800)
ON CONFLICT (name) DO NOTHING;

-- ===========================================
-- TABLE: ai_usage_log
-- ===========================================
-- Append-only audit log of every AI action a user performs.
-- credits_consumed tracks how many credits were deducted per call.

CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id               UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id          UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type      TEXT        NOT NULL,
  credits_consumed INTEGER     NOT NULL DEFAULT 1,
  metadata         JSONB       DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient per-user time-range queries.
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user
  ON public.ai_usage_log(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_created
  ON public.ai_usage_log(user_id, created_at);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- ai_credit_packages: anyone can read active packages (pricing page).
ALTER TABLE public.ai_credit_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active credit packages"
  ON public.ai_credit_packages
  FOR SELECT
  USING (is_active = TRUE);

-- ai_usage_log: users can only access their own rows.
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI usage"
  ON public.ai_usage_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI usage"
  ON public.ai_usage_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- FUNCTION: reset_monthly_ai_credits (trigger)
-- ===========================================
-- Fires BEFORE UPDATE on users. When ai_credits_reset_at has elapsed,
-- resets the credit balance to the tier's monthly allowance and schedules
-- the next reset 1 month out.

CREATE OR REPLACE FUNCTION reset_monthly_ai_credits()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ai_credits_reset_at IS NOT NULL AND NEW.ai_credits_reset_at < NOW() THEN
    -- Assign credits based on the user's current subscription tier.
    NEW.ai_credits_remaining := CASE NEW.subscription_tier
      WHEN 'free'     THEN 5
      WHEN 'ai_lite'  THEN 100
      WHEN 'ai_pro'   THEN 500
      ELSE NEW.ai_credits_remaining  -- preserve credits for unrecognised tiers
    END;
    NEW.ai_credits_reset_at := NOW() + INTERVAL '1 month';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to the users table.
-- Drop first so the migration is safe to re-run.
DROP TRIGGER IF EXISTS check_ai_credits_reset ON public.users;

CREATE TRIGGER check_ai_credits_reset
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION reset_monthly_ai_credits();
