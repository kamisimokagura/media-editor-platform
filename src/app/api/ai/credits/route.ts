import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServerSupabaseAdmin } from "@/lib/supabase/server";

interface CreditRequestBody {
  action: "check" | "consume";
  operation: string;
  credits_needed?: number;
  credits_consumed?: number;
}

export async function POST(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Supabase未設定" }, { status: 503 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  let body: CreditRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエスト" }, { status: 400 });
  }

  if (!body.action || !body.operation) {
    return NextResponse.json({ error: "action と operation は必須です" }, { status: 400 });
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("ai_credits_remaining")
    .eq("id", user.id)
    .single();

  if (userError || !userData) {
    return NextResponse.json({ error: "ユーザー情報の取得に失敗しました" }, { status: 500 });
  }

  const creditsRemaining = userData.ai_credits_remaining ?? 0;

  if (body.action === "check") {
    const creditsNeeded = body.credits_needed ?? 1;
    return NextResponse.json({
      allowed: creditsRemaining >= creditsNeeded,
      credits_remaining: creditsRemaining,
      credits_needed: creditsNeeded,
    });
  }

  if (body.action === "consume") {
    const creditsConsumed = body.credits_consumed ?? 1;

    if (creditsRemaining < creditsConsumed) {
      return NextResponse.json({
        success: false,
        error: "クレジットが不足しています",
        credits_remaining: creditsRemaining,
      }, { status: 402 });
    }

    const admin = await createServerSupabaseAdmin();

    const { error: updateError } = await admin
      .from("users")
      .update({ ai_credits_remaining: creditsRemaining - creditsConsumed })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ error: "クレジットの更新に失敗しました" }, { status: 500 });
    }

    await admin.from("ai_usage_log").insert({
      user_id: user.id,
      action_type: body.operation,
      credits_consumed: creditsConsumed,
      metadata: { operation: body.operation },
    });

    return NextResponse.json({
      success: true,
      credits_remaining: creditsRemaining - creditsConsumed,
    });
  }

  return NextResponse.json({ error: "不正なaction" }, { status: 400 });
}
