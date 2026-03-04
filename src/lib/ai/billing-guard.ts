import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import { getOperationCost } from "@/lib/ai/costs";
import type { Json } from "@/types/database";

interface BillingResult {
  userId: string;
  cost: number;
  creditsRemaining: number;
}

interface BillingError {
  response: NextResponse;
}

/**
 * Reserve credits before an AI operation.
 * Returns user info on success, or a NextResponse error.
 */
export async function reserveCredits(
  operation: string,
  model?: string
): Promise<BillingResult | BillingError> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      response: NextResponse.json({ error: "認証が必要です" }, { status: 401 }),
    };
  }

  const cost = getOperationCost(operation, model);

  const admin = await createServerSupabaseAdmin();
  const { data, error } = await admin.rpc("consume_credits", {
    p_user_id: user.id,
    p_amount: cost,
  });

  if (error) {
    console.error("[billing-guard] RPC error:", error);
    return {
      response: NextResponse.json(
        { error: "クレジット処理に失敗しました" },
        { status: 500 }
      ),
    };
  }

  const remaining = data as number;

  if (remaining === -1) {
    return {
      response: NextResponse.json(
        { error: "クレジットが不足しています", credits_remaining: 0 },
        { status: 402 }
      ),
    };
  }

  return {
    userId: user.id,
    cost,
    creditsRemaining: remaining,
  };
}

/**
 * Refund credits after a failed AI operation.
 */
export async function refundCredits(userId: string, operation: string, model?: string): Promise<void> {
  const cost = getOperationCost(operation, model);

  try {
    const admin = await createServerSupabaseAdmin();
    await admin.rpc("refund_credits", {
      p_user_id: userId,
      p_amount: cost,
    });
  } catch (err) {
    console.error("[billing-guard] Refund failed:", err);
  }
}

/**
 * Log AI usage after successful operation.
 */
export async function logUsage(
  userId: string,
  operation: string,
  cost: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const admin = await createServerSupabaseAdmin();
    await admin.from("ai_usage_log").insert({
      user_id: userId,
      action_type: operation,
      credits_consumed: cost,
      metadata: (metadata ?? { operation }) as unknown as Json,
    });
  } catch (err) {
    console.error("[billing-guard] Usage log failed:", err);
  }
}

/** Type guard to check if result is an error */
export function isBillingError(result: BillingResult | BillingError): result is BillingError {
  return "response" in result;
}
