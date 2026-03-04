-- Migration: Restrict user profile update columns
-- Issue #1: Users should only update profile fields, not billing/subscription fields

-- Drop the existing permissive update policy
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- New restrictive policy: only allow updating safe profile columns
CREATE POLICY "Users can update own profile columns only"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Ensure billing/subscription columns are NOT changed by the user
    -- This is enforced by checking the columns haven't changed from their current values
    AND subscription_tier IS NOT DISTINCT FROM (SELECT subscription_tier FROM users WHERE id = auth.uid())
    AND subscription_status IS NOT DISTINCT FROM (SELECT subscription_status FROM users WHERE id = auth.uid())
    AND ai_credits_remaining IS NOT DISTINCT FROM (SELECT ai_credits_remaining FROM users WHERE id = auth.uid())
    AND ai_credits_reset_at IS NOT DISTINCT FROM (SELECT ai_credits_reset_at FROM users WHERE id = auth.uid())
    AND stripe_customer_id IS NOT DISTINCT FROM (SELECT stripe_customer_id FROM users WHERE id = auth.uid())
    AND stripe_subscription_id IS NOT DISTINCT FROM (SELECT stripe_subscription_id FROM users WHERE id = auth.uid())
  );

-- Ensure service_role can still update all columns (bypasses RLS by default)
-- No additional policy needed since service_role bypasses RLS
