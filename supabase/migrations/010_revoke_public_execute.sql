-- Migration 010: Revoke PUBLIC execute on credit RPC functions
-- Ensures no implicit PUBLIC grant remains (PostgreSQL default behavior).

REVOKE EXECUTE ON FUNCTION consume_credits(UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION refund_credits(UUID, INTEGER) FROM PUBLIC;

-- Re-confirm only service_role has execute
GRANT EXECUTE ON FUNCTION consume_credits(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION refund_credits(UUID, INTEGER) TO service_role;
