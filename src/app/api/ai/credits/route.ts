import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServerSupabaseAdmin } from "@/lib/supabase/server";
import { getOperationCost, isValidOperation } from "@/lib/ai/costs";
import type { Json } from "@/types/database";

export async function POST(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Supabase未設定" }, { status: 503 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  let body: { action: string; operation: string; model?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエスト" }, { status: 400 });
  }

  if (!body.action || !body.operation) {
    return NextResponse.json({ error: "action と operation は必須です" }, { status: 400 });
  }

  if (!isValidOperation(body.operation, body.model)) {
    return NextResponse.json({ error: "不正な operation または model です" }, { status: 400 });
  }

  // Server-side cost determination (never trust client)
  const cost = getOperationCost(body.operation, body.model);

  if (body.action === "check") {
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("ai_credits_remaining")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "ユーザー情報の取得に失敗しました" }, { status: 500 });
    }

    const creditsRemaining = userData.ai_credits_remaining ?? 0;
    return NextResponse.json({
      allowed: creditsRemaining >= cost,
      credits_remaining: creditsRemaining,
      credits_needed: cost,
    });
  }

  if (body.action === "consume") {
    const admin = await createServerSupabaseAdmin();
    const { data, error } = await admin.rpc("consume_credits", {
      p_user_id: user.id,
      p_amount: cost,
    });

    if (error) {
      return NextResponse.json({ error: "クレジットの更新に失敗しました" }, { status: 500 });
    }

    const remaining = data as number;

    if (remaining === -1) {
      return NextResponse.json({
        success: false,
        error: "クレジットが不足しています",
        credits_remaining: 0,
      }, { status: 402 });
    }

    await admin.from("ai_usage_log").insert({
      user_id: user.id,
      action_type: body.operation,
      credits_consumed: cost,
      metadata: { operation: body.operation, model: body.model } as unknown as Json,
    });

    return NextResponse.json({
      success: true,
      credits_remaining: remaining,
    });
  }

  return NextResponse.json({ error: "不正なaction" }, { status: 400 });
}
