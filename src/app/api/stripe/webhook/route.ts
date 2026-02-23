import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

const STRIPE_WEBHOOK_TOLERANCE_SECONDS = 300; // 5 minutes

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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      console.log(
        `[stripe-webhook] Checkout completed: ${session.id}, customer: ${session.customer}`
      );
      // TODO: Update user subscription status in database
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object;
      console.log(
        `[stripe-webhook] Subscription updated: ${subscription.id}, status: ${subscription.status}`
      );
      // TODO: Sync subscription status to database
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      console.log(
        `[stripe-webhook] Subscription deleted: ${subscription.id}`
      );
      // TODO: Revoke user's pro access in database
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      console.log(
        `[stripe-webhook] Payment failed: invoice ${invoice.id}, customer: ${invoice.customer}`
      );
      // TODO: Notify user of payment failure
      break;
    }
    default:
      console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
