import { NextRequest, NextResponse } from "next/server";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/server";
import { sanitizeReturnUrl } from "@/lib/api/origin";
import {
  badRequestResponse,
  optionalEmail,
  optionalEnumValue,
  parseJsonBody,
  requireStripePriceId,
  toOptionalString,
} from "@/lib/api/validation";

interface CheckoutRequestBody {
  priceId?: unknown;
  planTier?: unknown;
  billingCycle?: unknown;
  checkoutMode?: unknown;
  successUrl?: unknown;
  cancelUrl?: unknown;
  customerEmail?: unknown;
}

const BILLING_CYCLES = ["monthly", "yearly", "one_time"] as const;
const CHECKOUT_MODES = ["subscription", "payment"] as const;

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripeが未設定です。STRIPE_SECRET_KEYを設定してください。" },
      { status: 503 }
    );
  }

  const parsedBody = await parseJsonBody(request, {
    invalidJsonMessage: "JSONリクエストの形式が不正です。",
  });
  if ("response" in parsedBody) {
    return parsedBody.response;
  }
  const body = parsedBody.value as CheckoutRequestBody;

  const priceIdCheck = requireStripePriceId(body.priceId);
  if (!priceIdCheck.ok) {
    return badRequestResponse("priceIdは必須で、形式は price_xxx である必要があります。");
  }

  const billingCycleCheck = optionalEnumValue(body.billingCycle, BILLING_CYCLES, "billingCycle");
  if (!billingCycleCheck.ok) {
    return badRequestResponse("billingCycleが不正です。");
  }

  const checkoutModeCheck = optionalEnumValue(body.checkoutMode, CHECKOUT_MODES, "checkoutMode");
  if (!checkoutModeCheck.ok) {
    return badRequestResponse("checkoutModeが不正です。");
  }

  const planTier = toOptionalString(body.planTier, 64);
  const customerEmailCheck = optionalEmail(body.customerEmail);
  if (!customerEmailCheck.ok) {
    return badRequestResponse("customerEmailが不正です。");
  }

  const rawSuccessUrl = toOptionalString(body.successUrl, 2048);
  if (body.successUrl !== undefined && body.successUrl !== null && !rawSuccessUrl) {
    return badRequestResponse("successUrlが不正です。");
  }

  const rawCancelUrl = toOptionalString(body.cancelUrl, 2048);
  if (body.cancelUrl !== undefined && body.cancelUrl !== null && !rawCancelUrl) {
    return badRequestResponse("cancelUrlが不正です。");
  }

  const successUrl = sanitizeReturnUrl(rawSuccessUrl, "/subscription?status=success", request);
  const cancelUrl = sanitizeReturnUrl(rawCancelUrl, "/subscription?status=cancel", request);
  const checkoutMode =
    checkoutModeCheck.value ??
    (billingCycleCheck.value === "one_time" ? "payment" : "subscription");

  const params = new URLSearchParams();
  params.set("mode", checkoutMode);
  params.set("line_items[0][price]", priceIdCheck.value);
  params.set("line_items[0][quantity]", "1");
  params.set("success_url", successUrl);
  params.set("cancel_url", cancelUrl);

  if (planTier) {
    params.set("metadata[plan_tier]", planTier);
  }
  if (billingCycleCheck.value) {
    params.set("metadata[billing_cycle]", billingCycleCheck.value);
  }
  if (customerEmailCheck.value) {
    params.set("customer_email", customerEmailCheck.value);
  }

  try {
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      cache: "no-store",
    });

    const result = await stripeResponse.json();

    if (!stripeResponse.ok) {
      const message =
        typeof result?.error?.message === "string"
          ? result.error.message
          : "Stripeチェックアウトセッションの作成に失敗しました。";
      return NextResponse.json({ error: message }, { status: stripeResponse.status });
    }

    await trackServerEvent({
      request,
      eventName: ANALYTICS_EVENTS.CHECKOUT_SESSION_CREATED,
      pagePath: "/api/stripe/checkout",
      eventParams: {
        plan_tier: planTier,
        billing_cycle: billingCycleCheck.value,
        checkout_mode: checkoutMode,
        price_id: priceIdCheck.value,
        stripe_session_id: typeof result?.id === "string" ? result.id : null,
        has_checkout_url: Boolean(result?.url),
      },
    });

    return NextResponse.json({
      sessionId: result.id,
      url: result.url ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "チェックアウトセッション作成中に予期しないエラーが発生しました。",
      },
      { status: 500 }
    );
  }
}
