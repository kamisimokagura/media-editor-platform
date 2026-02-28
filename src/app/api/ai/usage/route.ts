import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const TIER_LIMITS: Record<string, number> = {
  free: 5,
  ai_lite: 100,
  ai_pro: 500,
};

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Supabase未設定" }, { status: 503 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("users")
    .select("subscription_tier, ai_credits_remaining, ai_credits_reset_at")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "ユーザー情報の取得に失敗しました" }, { status: 500 });
  }

  const tier = data.subscription_tier ?? "free";
  const creditsLimit = TIER_LIMITS[tier] ?? 5;

  return NextResponse.json({
    tier,
    credits_remaining: data.ai_credits_remaining ?? 0,
    credits_limit: creditsLimit,
    reset_at: data.ai_credits_reset_at,
  });
}
