import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import type { SubscriptionTier } from "@/types/database";

const STRIPE_WEBHOOK_TOLERANCE_SECONDS = 300; // 5 minutes

const TIER_CREDITS: Record<string, number> = {
  free: 5,
  ai_lite: 100,
  ai_pro: 500,
};

function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string
): boolean {
  const elements = signatureHeader.split(",");
  let timestamp: string | null = null;
  const signatures: string[] = [];

  for (const element of elements) {
    const [key, value] = element.split("=");
    if (key === "t") timestamp = value;
    if (key === "v1") signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) return false;

  const timestampNum = parseInt(timestamp, 10);
  if (Number.isNaN(timestampNum)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestampNum) > STRIPE_WEBHOOK_TOLERANCE_SECONDS) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");

  return signatures.some((sig) => {
    try {
      return timingSafeEqual(
        Buffer.from(expectedSignature, "hex"),
        Buffer.from(sig, "hex")
      );
    } catch {
      return false;
    }
  });
}

function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: "Failed to read request body" },
      { status: 400 }
    );
  }

  if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const supabaseAvailable = hasSupabaseConfig();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const customerId = session.customer as string | undefined;
      const mode = session.mode as string | undefined;
      const metadata = session.metadata as Record<string, string> | undefined;
      const planTier = metadata?.plan_tier as SubscriptionTier | undefined;
      const subscriptionId = session.subscription as string | undefined;
      const status = session.status as string | undefined;

      console.log(
        `[stripe-webhook] Checkout completed: ${session.id}, customer: ${customerId}, mode: ${mode}`
      );

      if (supabaseAvailable && customerId) {
        const supabase = await createServerSupabaseAdmin();

        if (mode === "subscription" && planTier) {
          const credits = TIER_CREDITS[planTier] ?? 5;
          const isTrialing = status === "trialing" || (session as Record<string, unknown>).payment_status === "no_payment_required";

          const { error } = await supabase
            .from("users")
            .update({
              subscription_tier: planTier,
              subscription_status: isTrialing ? "trialing" : "active",
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId ?? null,
              ai_credits_remaining: credits,
              ai_credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq("stripe_customer_id", customerId);

          if (error) {
            // Fallback: try matching by email from the session
            const customerEmail = session.customer_email as string | undefined;
            if (customerEmail) {
              await supabase
                .from("users")
                .update({
                  subscription_tier: planTier,
                  subscription_status: isTrialing ? "trialing" : "active",
                  stripe_customer_id: customerId,
                  stripe_subscription_id: subscriptionId ?? null,
                  ai_credits_remaining: credits,
                  ai_credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                })
                .eq("email", customerEmail);
            }
          }
        } else if (mode === "payment" && metadata?.billing_cycle === "one_time") {
          // One-time credit package purchase
          const packCredits = getPackCredits(metadata.plan_tier);
          if (packCredits !== null) {
            const { data: userData } = await supabase
              .from("users")
              .select("ai_credits_remaining")
              .eq("stripe_customer_id", customerId)
              .single();

            const currentCredits = userData?.ai_credits_remaining ?? 0;
            const newCredits = packCredits === -1 ? 999999 : currentCredits + packCredits;

            await supabase
              .from("users")
              .update({
                stripe_customer_id: customerId,
                ai_credits_remaining: newCredits,
              })
              .eq("stripe_customer_id", customerId);

            await supabase.from("ai_usage_log").insert({
              user_id: (await supabase.from("users").select("id").eq("stripe_customer_id", customerId).single()).data?.id ?? "",
              action_type: "credit_purchase",
              credits_consumed: 0,
              metadata: { pack: metadata.plan_tier, credits_added: packCredits },
            });
          }
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const subStatus = subscription.status as string;
      const customerId = subscription.customer as string | undefined;
      const items = subscription.items as { data?: Array<{ price?: { id?: string } }> } | undefined;
      const priceId = items?.data?.[0]?.price?.id;

      console.log(
        `[stripe-webhook] Subscription updated: ${subscription.id}, status: ${subStatus}`
      );

      if (supabaseAvailable && customerId) {
        const supabase = await createServerSupabaseAdmin();

        const tier = priceIdToTier(priceId);
        const updateData: Record<string, unknown> = {
          subscription_status: mapStripeStatus(subStatus),
        };

        if (tier) {
          updateData.subscription_tier = tier;
          updateData.ai_credits_remaining = TIER_CREDITS[tier] ?? 5;
          updateData.ai_credits_reset_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        await supabase
          .from("users")
          .update(updateData)
          .eq("stripe_customer_id", customerId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId = subscription.customer as string | undefined;

      console.log(
        `[stripe-webhook] Subscription deleted: ${subscription.id}`
      );

      if (supabaseAvailable && customerId) {
        const supabase = await createServerSupabaseAdmin();

        await supabase
          .from("users")
          .update({
            subscription_tier: "free" as SubscriptionTier,
            subscription_status: "canceled",
            stripe_subscription_id: null,
            ai_credits_remaining: TIER_CREDITS.free,
          })
          .eq("stripe_customer_id", customerId);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customerId = invoice.customer as string | undefined;

      console.log(
        `[stripe-webhook] Payment failed: invoice ${invoice.id}, customer: ${customerId}`
      );

      if (supabaseAvailable && customerId) {
        const supabase = await createServerSupabaseAdmin();

        await supabase
          .from("users")
          .update({ subscription_status: "past_due" })
          .eq("stripe_customer_id", customerId);
      }
      break;
    }

    case "customer.subscription.trial_will_end": {
      const subscription = event.data.object;
      const customerId = subscription.customer as string | undefined;

      console.log(
        `[stripe-webhook] Trial ending soon: ${subscription.id}, customer: ${customerId}`
      );

      if (supabaseAvailable && customerId) {
        const supabase = await createServerSupabaseAdmin();

        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (userData) {
          await supabase.from("analytics_events").insert({
            user_id: userData.id,
            event_name: "TRIAL_ENDING_SOON",
            event_category: "subscription",
            event_params: {
              subscription_id: String(subscription.id ?? ""),
              trial_end: String(subscription.trial_end ?? ""),
            },
          });
        }
      }
      break;
    }

    default:
      console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

function getPackCredits(packTier: string | undefined): number | null {
  switch (packTier) {
    case "pack_s": return 200;
    case "pack_m": return 600;
    case "pack_l": return 1500;
    case "lifetime": return -1; // unlimited
    default: return null;
  }
}

function priceIdToTier(priceId: string | undefined): SubscriptionTier | null {
  if (!priceId) return null;

  const mapping: Record<string, SubscriptionTier> = {};
  if (process.env.STRIPE_PRICE_AI_LITE_MONTHLY) mapping[process.env.STRIPE_PRICE_AI_LITE_MONTHLY] = "ai_lite";
  if (process.env.STRIPE_PRICE_AI_LITE_YEARLY) mapping[process.env.STRIPE_PRICE_AI_LITE_YEARLY] = "ai_lite";
  if (process.env.STRIPE_PRICE_AI_PRO_MONTHLY) mapping[process.env.STRIPE_PRICE_AI_PRO_MONTHLY] = "ai_pro";
  if (process.env.STRIPE_PRICE_AI_PRO_YEARLY) mapping[process.env.STRIPE_PRICE_AI_PRO_YEARLY] = "ai_pro";

  return mapping[priceId] ?? null;
}

function mapStripeStatus(status: string): string {
  const statusMap: Record<string, string> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "unpaid",
    incomplete: "past_due",
    incomplete_expired: "canceled",
    paused: "canceled",
  };
  return statusMap[status] ?? "active";
}
