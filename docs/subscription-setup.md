---
name: subscription-setup
description: Environment variable requirements and behavior for Supabase + Stripe subscription integration.
---

# Subscription Setup

## Feature Flag

- `NEXT_PUBLIC_AI_ENABLED=false` (default)
  - `false`: AI機能とサブスクページは非表示。ヘッダーからリンクも非表示。
  - `true`: 全AI機能・サブスクページ・決済が有効。

## Required Environment Variables

### Stripe
- `STRIPE_SECRET_KEY`
  - Required for `/api/stripe/checkout` and `/api/stripe/portal`.
  - If missing, API returns `503` with a clear config error.

- `STRIPE_WEBHOOK_SECRET`
  - Required for `/api/stripe/webhook`.
  - HMAC-SHA256 signature verification.

### Stripe Price IDs

**AI Tier Subscriptions (7日間トライアル付き):**

| Product | Env Var | Price |
|---------|---------|-------|
| AI Lite 月額 | `STRIPE_PRICE_AI_LITE_MONTHLY` | 480 JPY/month |
| AI Lite 年額 | `STRIPE_PRICE_AI_LITE_YEARLY` | 3,980 JPY/year |
| AI Pro 月額 | `STRIPE_PRICE_AI_PRO_MONTHLY` | 980 JPY/month |
| AI Pro 年額 | `STRIPE_PRICE_AI_PRO_YEARLY` | 7,980 JPY/year |

**AI Credit Packs (買い切り):**

| Product | Env Var | Price | Credits |
|---------|---------|-------|---------|
| Pack S | `STRIPE_PRICE_PACK_S` | 1,980 JPY | 200 |
| Pack M | `STRIPE_PRICE_PACK_M` | 4,980 JPY | 600 |
| Pack L | `STRIPE_PRICE_PACK_L` | 9,800 JPY | 1,500 |
| Lifetime | `STRIPE_PRICE_LIFETIME` | 14,800 JPY | 無制限 |

**Legacy (backward compat):**
- `STRIPE_PRICE_PRO_MONTHLY`: 旧Proプラン月額
- `STRIPE_PRICE_PRO_ONETIME`: 旧Proプラン買い切り
- `STRIPE_PRICE_PRO_YEARLY`: 旧Proプラン年額

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Required for loading live plans from `subscription_plans`.
  - If missing, `/api/subscription/plans` returns fallback plan data.
- `SUPABASE_SERVICE_ROLE_KEY`
  - Required for webhook DB writes and credit management.

## Stripe Dashboard Setup

### Products to Create

1. **AI Lite Monthly** - ¥480/month recurring (JPY)
2. **AI Lite Yearly** - ¥3,980/year recurring (JPY)
3. **AI Pro Monthly** - ¥980/month recurring (JPY)
4. **AI Pro Yearly** - ¥7,980/year recurring (JPY)
5. **AI Pack S** - ¥1,980 one-time (JPY)
6. **AI Pack M** - ¥4,980 one-time (JPY)
7. **AI Pack L** - ¥9,800 one-time (JPY)
8. **AI Lifetime** - ¥14,800 one-time (JPY)

### Trial Setup
- Monthly subscription plans include 7-day free trial automatically via checkout API.
- Trial ends behavior: cancel if no payment method added.

### Webhook Setup
- Endpoint: `https://your-domain.com/api/stripe/webhook`
- Events to enable:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `customer.subscription.trial_will_end`

## Runtime Behavior

### Plan Source
- `supabase`: when active plans are available in `subscription_plans`.
- `fallback`: when Supabase config/data is unavailable.

### Webhook Handlers
1. **checkout.session.completed**: Updates user tier, status, credits. Handles both subscription and one-time purchases.
2. **customer.subscription.updated**: Syncs subscription status changes (trialing → active, etc).
3. **customer.subscription.deleted**: Reverts to free tier.
4. **invoice.payment_failed**: Sets status to `past_due`.
5. **customer.subscription.trial_will_end**: Records analytics event.

### AI Credits
- Free: 5 credits/month
- AI Lite: 100 credits/month
- AI Pro: 500 credits/month
- Credits reset monthly based on `ai_credits_reset_at`.
- One-time packs add to existing balance.

### Billing Portal
- Reads `stripe_customer_id` from logged-in user record.
- Allows managing payment methods and cancellation.

### UI Status
- Subscription page shows Supabase/Stripe configuration badges.
- When `AI_ENABLED=false`: subscription page shows "準備中" message.
