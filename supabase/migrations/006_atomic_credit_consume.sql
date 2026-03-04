-- Migration: Atomic credit consumption functions
-- Issue #5: Race condition in credit consumption - read-then-write is not atomic

-- Function: Atomically consume credits
-- Returns remaining credits after consumption, or -1 if insufficient
CREATE OR REPLACE FUNCTION consume_credits(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  UPDATE users
  SET ai_credits_remaining = ai_credits_remaining - p_amount
  WHERE id = p_user_id
    AND ai_credits_remaining >= p_amount
  RETURNING ai_credits_remaining INTO v_remaining;

  IF NOT FOUND THEN
    RETURN -1; -- Insufficient credits
  END IF;

  RETURN v_remaining;
END;
$$;

-- Function: Refund credits (for failed AI operations)
CREATE OR REPLACE FUNCTION refund_credits(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
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

-- Grant execute to authenticated users (needed for RPC calls)
GRANT EXECUTE ON FUNCTION consume_credits(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION refund_credits(UUID, INTEGER) TO authenticated;
-- Also grant to service_role for webhook/admin usage
GRANT EXECUTE ON FUNCTION consume_credits(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION refund_credits(UUID, INTEGER) TO service_role;
