import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/server";
import { sanitizeReturnUrl } from "@/lib/api/origin";
import {
  badRequestResponse,
  optionalStripeCustomerId,
  parseJsonBody,
  toOptionalString,
} from "@/lib/api/validation";

interface PortalRequestBody {
  customerId?: unknown;
  returnUrl?: unknown;
}

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripeが未設定です。STRIPE_SECRET_KEYを設定してください。" },
      { status: 503 }
    );
  }

  const parsedBody = await parseJsonBody(request, {
    allowEmptyBody: true,
    invalidJsonMessage: "JSONリクエストの形式が不正です。",
  });
  if ("response" in parsedBody) {
    return parsedBody.response;
  }
  const body = parsedBody.value as PortalRequestBody;

  const customerIdCheck = optionalStripeCustomerId(body.customerId);
  if (!customerIdCheck.ok) {
    return badRequestResponse("customerIdが不正です。");
  }

  let customerId = customerIdCheck.value;

  if (!customerId && hasSupabaseConfig()) {
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("users")
          .select("stripe_customer_id")
          .eq("id", user.id)
          .single();

        customerId = data?.stripe_customer_id ?? undefined;
      }
    } catch {
      // Ignore and continue to explicit error response below.
    }
  }

  if (!customerId) {
    return NextResponse.json(
      { error: "Stripe顧客IDが見つかりません。先にサブスクリプションを紐づけてください。" },
      { status: 400 }
    );
  }

  const rawReturnUrl = toOptionalString(body.returnUrl, 2048);
  if (body.returnUrl !== undefined && body.returnUrl !== null && !rawReturnUrl) {
    return badRequestResponse("returnUrlが不正です。");
  }

  const returnUrl = sanitizeReturnUrl(rawReturnUrl, "/subscription", request);

  const params = new URLSearchParams();
  params.set("customer", customerId);
  params.set("return_url", returnUrl);

  try {
    const stripeResponse = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
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
          : "Stripe請求ポータルセッションの作成に失敗しました。";
      return NextResponse.json({ error: message }, { status: stripeResponse.status });
    }

    await trackServerEvent({
      request,
      eventName: ANALYTICS_EVENTS.BILLING_PORTAL_OPENED,
      pagePath: "/api/stripe/portal",
      eventParams: {
        stripe_customer_id: customerId,
        has_portal_url: Boolean(result?.url),
      },
    });

    return NextResponse.json({
      url: result.url ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "請求ポータルセッション作成中に予期しないエラーが発生しました。",
      },
      { status: 500 }
    );
  }
}
