-- Migration 008: Harden credit RPC permissions
-- Prevent arbitrary credit mutation by authenticated clients.

CREATE OR REPLACE FUNCTION consume_credits(p_user_id UUID, p_amount INTEGER)
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
  SET ai_credits_remaining = ai_credits_remaining - p_amount
  WHERE id = p_user_id
    AND ai_credits_remaining >= p_amount
  RETURNING ai_credits_remaining INTO v_remaining;

  IF NOT FOUND THEN
    RETURN -1;
  END IF;

  RETURN v_remaining;
END;
$$;

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
  SET ai_credits_remaining = ai_credits_remaining + p_amount
  WHERE id = p_user_id
  RETURNING ai_credits_remaining INTO v_remaining;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN v_remaining;
END;
$$;

REVOKE EXECUTE ON FUNCTION consume_credits(UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION consume_credits(UUID, INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION refund_credits(UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION refund_credits(UUID, INTEGER) FROM authenticated;

GRANT EXECUTE ON FUNCTION consume_credits(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION refund_credits(UUID, INTEGER) TO service_role;
