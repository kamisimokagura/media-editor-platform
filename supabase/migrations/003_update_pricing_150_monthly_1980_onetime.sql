-- Align visible plans to:
-- - Monthly subscription: 150 JPY
-- - One-time buyout: 1980 JPY (stored in price_yearly for backward compatibility)

UPDATE public.subscription_plans
SET
  name = '無料',
  price_monthly = 0,
  price_yearly = 0,
  is_active = TRUE
WHERE tier = 'free';

UPDATE public.subscription_plans
SET
  name = 'プロ',
  price_monthly = 150,
  price_yearly = 1980,
  is_active = TRUE
WHERE tier = 'pro';

UPDATE public.subscription_plans
SET is_active = FALSE
WHERE tier IN ('business', 'enterprise');
