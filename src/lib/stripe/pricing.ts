import type { SubscriptionTier } from "@/types/database";

/**
 * Server-side price ID to tier mapping.
 * Checkout and webhook use this instead of trusting client metadata.
 */
export const PRICE_TO_TIER: Record<string, { tier: SubscriptionTier; type: "subscription" | "one_time"; credits?: number }> = {
  // Subscription tiers - populated from env at startup
};

// Credit pack price IDs
export const PACK_PRICE_IDS: Record<string, { tier: string; credits: number }> = {};

/** Build the mapping from environment variables */
function buildPriceMapping() {
  const env = process.env;

  // Subscription prices
  if (env.STRIPE_PRICE_AI_LITE_MONTHLY) PRICE_TO_TIER[env.STRIPE_PRICE_AI_LITE_MONTHLY] = { tier: "ai_lite", type: "subscription" };
  if (env.STRIPE_PRICE_AI_LITE_YEARLY) PRICE_TO_TIER[env.STRIPE_PRICE_AI_LITE_YEARLY] = { tier: "ai_lite", type: "subscription" };
  if (env.STRIPE_PRICE_AI_PRO_MONTHLY) PRICE_TO_TIER[env.STRIPE_PRICE_AI_PRO_MONTHLY] = { tier: "ai_pro", type: "subscription" };
  if (env.STRIPE_PRICE_AI_PRO_YEARLY) PRICE_TO_TIER[env.STRIPE_PRICE_AI_PRO_YEARLY] = { tier: "ai_pro", type: "subscription" };

  // Credit pack prices
  if (env.STRIPE_PRICE_PACK_S) PACK_PRICE_IDS[env.STRIPE_PRICE_PACK_S] = { tier: "pack_s", credits: 200 };
  if (env.STRIPE_PRICE_PACK_M) PACK_PRICE_IDS[env.STRIPE_PRICE_PACK_M] = { tier: "pack_m", credits: 600 };
  if (env.STRIPE_PRICE_PACK_L) PACK_PRICE_IDS[env.STRIPE_PRICE_PACK_L] = { tier: "pack_l", credits: 1500 };
  if (env.STRIPE_PRICE_LIFETIME) PACK_PRICE_IDS[env.STRIPE_PRICE_LIFETIME] = { tier: "lifetime", credits: -1 };
}

// Initialize on first import
buildPriceMapping();

/** All allowed price IDs (for checkout validation) */
export function isAllowedPriceId(priceId: string): boolean {
  return priceId in PRICE_TO_TIER || priceId in PACK_PRICE_IDS;
}

export const TIER_CREDITS: Record<string, number> = {
  free: 5,
  ai_lite: 100,
  ai_pro: 500,
};
