-- Migration 009: Credit ceiling + handle_new_user search_path hardening
--
-- C2: Add credit ceiling to refund_credits to prevent unbounded inflation.
-- M1: Add SET search_path to handle_new_user trigger function.
-- H1: Add comment documenting retention policy for stripe_webhook_events.

-- C2: Recreate refund_credits with credit ceiling (999999)
CREATE OR REPLACE FUNCTION refund_credits(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining INTEGER;
  v_role TEXT := auth.role();
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF v_role IS DISTINCT FROM 'service_role' AND v_role IS DISTINCT FROM 'supabase_admin' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE users
  SET ai_credits_remaining = LEAST(ai_credits_remaining + p_amount, 999999)
  WHERE id = p_user_id
  RETURNING ai_credits_remaining INTO v_remaining;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN v_remaining;
END;
$$;

-- Permissions unchanged from migration 008
REVOKE EXECUTE ON FUNCTION refund_credits(UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION refund_credits(UUID, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION refund_credits(UUID, INTEGER) TO service_role;

-- M1: Harden handle_new_user with SET search_path
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
        updated_at = NOW();
    RETURN NEW;
END;
$$;

-- H1: Document retention policy for webhook idempotency table.
-- stripe_webhook_events rows MUST be retained for at least 30 days
-- (Stripe's retry window). Any cleanup job must enforce this minimum.
COMMENT ON TABLE stripe_webhook_events IS
  'Idempotency table for Stripe webhook events. RETENTION POLICY: Do NOT delete rows newer than 30 days. Stripe may retry events within this window.';
