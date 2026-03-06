import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import type { SubscriptionTier, SubscriptionStatus } from "@/types/database";
import { PRICE_TO_TIER, PACK_PRICE_IDS, TIER_CREDITS } from "@/lib/stripe/pricing";

const STRIPE_WEBHOOK_TOLERANCE_SECONDS = 300;

// --- Signature verification ---

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

// --- Idempotency helpers (Issue #7) ---

async function checkIdempotency(
  supabase: Awaited<ReturnType<typeof createServerSupabaseAdmin>>,
  eventId: string,
  eventType: string
): Promise<"new" | "duplicate" | "error"> {
  const { error } = await supabase.from("stripe_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
    status: "processing",
  });

  // Unique constraint violation — check if prior attempt failed and allow retry
  if (error?.code === "23505") {
    const { data: existing } = await supabase
      .from("stripe_webhook_events")
      .select("status")
      .eq("event_id", eventId)
      .single();

    if (existing?.status === "failed" || existing?.status === "processing") {
      // Prior attempt failed or stalled — allow retry
      await supabase
        .from("stripe_webhook_events")
        .update({ status: "processing", error_message: null })
        .eq("event_id", eventId);
      diagLog("info", eventId, eventType, `Retrying previously ${existing.status} event`);
      return "new";
    }

    console.log(`[stripe-webhook] Duplicate event skipped: ${eventId}`);
    return "duplicate";
  }
  if (error) {
    // Non-duplicate DB error must fail-closed to avoid duplicate side effects.
    console.error(`[stripe-webhook] Idempotency check error:`, error);
    return "error";
  }
  return "new";
}

async function markEventStatus(
  supabase: Awaited<ReturnType<typeof createServerSupabaseAdmin>>,
  eventId: string,
  status: "succeeded" | "failed",
  errorMessage?: string
) {
  await supabase
    .from("stripe_webhook_events")
    .update({
      status,
      error_message: errorMessage ?? null,
    })
    .eq("event_id", eventId);
}

// --- Diagnostic logger (Issue #8) ---

function diagLog(
  level: "info" | "error" | "warn",
  eventId: string,
  eventType: string,
  message: string,
  extra?: Record<string, unknown>
) {
  const payload = {
    event_id: eventId,
    event_type: eventType,
    message,
    ...extra,
    timestamp: new Date().toISOString(),
  };
  if (level === "error") console.error(`[stripe-webhook]`, JSON.stringify(payload));
  else if (level === "warn") console.warn(`[stripe-webhook]`, JSON.stringify(payload));
  else console.log(`[stripe-webhook]`, JSON.stringify(payload));
}

// --- User resolution helper (Issue #9) ---

async function resolveUserId(
  supabase: Awaited<ReturnType<typeof createServerSupabaseAdmin>>,
  clientReferenceId: string | undefined,
  customerId: string | undefined
): Promise<string | null> {
  // Primary: client_reference_id = user.id set at checkout
  if (clientReferenceId) {
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("id", clientReferenceId)
      .single();
    if (data) return data.id;
  }
  // Fallback: stripe_customer_id
  if (customerId) {
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();
    if (data) return data.id;
  }
  return null;
}

/** Fetch line items from Stripe to get actual price ID */
async function fetchCheckoutLineItems(sessionId: string): Promise<string | null> {
  if (!process.env.STRIPE_SECRET_KEY) return null;

  try {
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}/line_items?limit=1`,
      {
        headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.[0]?.price?.id ?? null;
  } catch {
    return null;
  }
}

// --- Assertion helper (Issue #8: no silent failures) ---

function assertUpdateSucceeded(
  result: { error: unknown; count?: number | null },
  context: string,
  eventId: string,
  eventType: string
): void {
  if (result.error) {
    throw new Error(`DB update failed [${context}]: ${JSON.stringify(result.error)}`);
  }
  // count is available when .update() includes count option
  // If count is 0, the user wasn't found - this is a critical issue
  if (result.count === 0) {
    diagLog("warn", eventId, eventType, `0 rows updated in ${context} - user may not exist`);
  }
}

// --- Main handler ---

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { id: string; type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const eventId = event.id;
  const eventType = event.type;

  if (!hasSupabaseConfig()) {
    diagLog("warn", eventId, eventType, "Supabase not configured, skipping DB operations");
    return NextResponse.json({ received: true });
  }

  const supabase = await createServerSupabaseAdmin();

  // Issue #7: Idempotency check
  const idempotencyResult = await checkIdempotency(supabase, eventId, eventType);
  if (idempotencyResult === "duplicate") {
    return NextResponse.json({ received: true, duplicate: true });
  }
  if (idempotencyResult === "error") {
    return NextResponse.json({ error: "Idempotency check failed" }, { status: 500 });
  }

  try {
    switch (eventType) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(supabase, event, eventId, eventType);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(supabase, event, eventId, eventType);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(supabase, event, eventId, eventType);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(supabase, event, eventId, eventType);
        break;

      case "customer.subscription.trial_will_end":
        await handleTrialEnding(supabase, event, eventId, eventType);
        break;

      default:
        diagLog("info", eventId, eventType, "Unhandled event type");
    }

    await markEventStatus(supabase, eventId, "succeeded");
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    diagLog("error", eventId, eventType, `Processing failed: ${errorMsg}`);
    await markEventStatus(supabase, eventId, "failed", errorMsg);
    // Return 500 so Stripe retries
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// --- Event handlers ---

async function handleCheckoutCompleted(
  supabase: Awaited<ReturnType<typeof createServerSupabaseAdmin>>,
  event: { data: { object: Record<string, unknown> } },
  eventId: string,
  eventType: string
) {
  const session = event.data.object;
  const customerId = session.customer as string | undefined;
  const mode = session.mode as string | undefined;
  const subscriptionId = session.subscription as string | undefined;
  const clientReferenceId = session.client_reference_id as string | undefined;
  const sessionId = session.id as string;

  diagLog("info", eventId, eventType, "Processing checkout", {
    sessionId, customerId, mode, clientReferenceId,
  });

  // Issue #9: Resolve user with guaranteed fallback
  const userId = await resolveUserId(supabase, clientReferenceId, customerId);
  if (!userId) {
    throw new Error(`Cannot resolve user: clientReferenceId=${clientReferenceId}, customerId=${customerId}`);
  }

  // Issue #9: Always save stripe_customer_id on first purchase
  if (customerId) {
    await supabase
      .from("users")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId)
      .is("stripe_customer_id", null);
  }

  // Fetch actual price ID from Stripe line items (server-side truth)
  const priceId = await fetchCheckoutLineItems(sessionId);
  if (!priceId) {
    throw new Error(`Failed to fetch line items for session: ${sessionId}`);
  }

  if (mode === "subscription") {
    const tierInfo = PRICE_TO_TIER[priceId];
    if (!tierInfo?.tier) {
      diagLog("warn", eventId, eventType, `Unknown subscription priceId: ${priceId}`);
      return;
    }

    const tier = tierInfo.tier;
    const credits = TIER_CREDITS[tier] ?? 5;
    const isTrialing =
      session.status === "trialing" ||
      (session as Record<string, unknown>).payment_status === "no_payment_required";

    const result = await supabase
      .from("users")
      .update({
        subscription_tier: tier,
        subscription_status: (isTrialing ? "trialing" : "active") as SubscriptionStatus,
        stripe_customer_id: customerId ?? null,
        stripe_subscription_id: subscriptionId ?? null,
        ai_credits_remaining: credits,
        ai_credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", userId);

    assertUpdateSucceeded(result, "subscription_checkout", eventId, eventType);
    diagLog("info", eventId, eventType, `Subscription activated: tier=${tier}, credits=${credits}`);

  } else if (mode === "payment") {
    const packInfo = PACK_PRICE_IDS[priceId];
    if (!packInfo) {
      diagLog("warn", eventId, eventType, `Unknown pack priceId: ${priceId}`);
      return;
    }
    let newCredits = 0;
    if (packInfo.credits === -1) {
      const result = await supabase
        .from("users")
        .update({ ai_credits_remaining: 999999 })
        .eq("id", userId);
      assertUpdateSucceeded(result, "credit_purchase_lifetime", eventId, eventType);
      newCredits = 999999;
    } else {
      const { data: remaining, error: creditError } = await supabase.rpc("refund_credits", {
        p_user_id: userId,
        p_amount: packInfo.credits,
      });
      if (creditError) {
        throw new Error(`credit_purchase rpc failed: ${JSON.stringify(creditError)}`);
      }
      newCredits = typeof remaining === "number" ? remaining : 0;
    }

    await supabase.from("ai_usage_log").insert({
      user_id: userId,
      action_type: "credit_purchase",
      credits_consumed: 0,
      metadata: { pack: packInfo.tier, credits_added: packInfo.credits, event_id: eventId },
    });

    diagLog("info", eventId, eventType, `Credits purchased: pack=${packInfo.tier}, added=${packInfo.credits}, remaining=${newCredits}`);
  }
}

async function handleSubscriptionUpdated(
  supabase: Awaited<ReturnType<typeof createServerSupabaseAdmin>>,
  event: { data: { object: Record<string, unknown> } },
  eventId: string,
  eventType: string
) {
  const subscription = event.data.object;
  const subStatus = subscription.status as string;
  const customerId = subscription.customer as string | undefined;
  const items = subscription.items as { data?: Array<{ price?: { id?: string } }> } | undefined;
  const priceId = items?.data?.[0]?.price?.id;
  const previousAttributes = (subscription as Record<string, unknown>).previous_attributes as Record<string, unknown> | undefined;

  diagLog("info", eventId, eventType, "Processing subscription update", {
    subscriptionId: subscription.id, subStatus, customerId, priceId,
  });

  if (!customerId) {
    throw new Error("subscription.updated missing customerId");
  }

  const tierInfo = priceId ? PRICE_TO_TIER[priceId] : undefined;
  const tier = tierInfo?.tier ?? null;

  const updateData: Record<string, unknown> = {
    subscription_status: mapStripeStatus(subStatus),
  };

  if (tier) {
    updateData.subscription_tier = tier;

    // Issue #12: Only reset credits when tier actually changed (not on every update)
    const tierChanged = previousAttributes && "items" in previousAttributes;
    if (tierChanged) {
      updateData.ai_credits_remaining = TIER_CREDITS[tier] ?? 5;
      updateData.ai_credits_reset_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      diagLog("info", eventId, eventType, `Tier changed, resetting credits to ${TIER_CREDITS[tier] ?? 5}`);
    }
  }

  const result = await supabase
    .from("users")
    .update(updateData)
    .eq("stripe_customer_id", customerId);

  assertUpdateSucceeded(result, "subscription_updated", eventId, eventType);
}

async function handleSubscriptionDeleted(
  supabase: Awaited<ReturnType<typeof createServerSupabaseAdmin>>,
  event: { data: { object: Record<string, unknown> } },
  eventId: string,
  eventType: string
) {
  const subscription = event.data.object;
  const customerId = subscription.customer as string | undefined;

  diagLog("info", eventId, eventType, "Processing subscription deletion", {
    subscriptionId: subscription.id, customerId,
  });

  if (!customerId) {
    throw new Error("subscription.deleted missing customerId");
  }

  const result = await supabase
    .from("users")
    .update({
      subscription_tier: "free" as SubscriptionTier,
      subscription_status: "canceled",
      stripe_subscription_id: null,
      ai_credits_remaining: TIER_CREDITS.free,
    })
    .eq("stripe_customer_id", customerId);

  assertUpdateSucceeded(result, "subscription_deleted", eventId, eventType);
}

async function handlePaymentFailed(
  supabase: Awaited<ReturnType<typeof createServerSupabaseAdmin>>,
  event: { data: { object: Record<string, unknown> } },
  eventId: string,
  eventType: string
) {
  const invoice = event.data.object;
  const customerId = invoice.customer as string | undefined;

  diagLog("info", eventId, eventType, "Processing payment failure", {
    invoiceId: invoice.id, customerId,
  });

  if (!customerId) {
    throw new Error("invoice.payment_failed missing customerId");
  }

  const result = await supabase
    .from("users")
    .update({ subscription_status: "past_due" })
    .eq("stripe_customer_id", customerId);

  assertUpdateSucceeded(result, "payment_failed", eventId, eventType);
}

async function handleTrialEnding(
  supabase: Awaited<ReturnType<typeof createServerSupabaseAdmin>>,
  event: { data: { object: Record<string, unknown> } },
  eventId: string,
  eventType: string
) {
  const subscription = event.data.object;
  const customerId = subscription.customer as string | undefined;

  diagLog("info", eventId, eventType, "Processing trial ending", {
    subscriptionId: subscription.id, customerId,
  });

  if (!customerId) return;

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
  return statusMap[status] ?? "past_due";
}
