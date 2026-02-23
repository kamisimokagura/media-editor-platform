---
name: subscription-setup
description: Environment variable requirements and behavior for Supabase + Stripe subscription integration.
---

# Subscription Setup

## Required Environment Variables

### Stripe
- `STRIPE_SECRET_KEY`
  - Required for `/api/stripe/checkout` and `/api/stripe/portal`.
  - If missing, API returns `503` with a clear config error.

### Optional Stripe Price IDs (Fallback Plan Mode)
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PRO_ONETIME`
  - `STRIPE_PRICE_PRO_MONTHLY`: monthly subscription price (150 JPY)
  - `STRIPE_PRICE_PRO_ONETIME`: one-time purchase price (1980 JPY)
  - Used when Supabase plan table is unavailable and fallback plans are returned.
  - `STRIPE_PRICE_PRO_YEARLY` is still accepted as backward-compatible fallback.

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Required for loading live plans from `subscription_plans`.
  - If missing, `/api/subscription/plans` returns fallback plan data.

## Runtime Behavior
- Plan source:
  - `supabase`: when active plans are available in `subscription_plans`.
  - `fallback`: when Supabase config/data is unavailable.
- Billing portal:
  - Reads `stripe_customer_id` from logged-in user record when request does not include `customerId`.
- UI status:
  - Subscription page shows Supabase/Stripe configuration badges to make setup state visible.
