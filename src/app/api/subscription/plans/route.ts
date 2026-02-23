import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SubscriptionTier } from "@/types/database";

interface PlanResponseItem {
  id: string;
  name: string;
  tier: SubscriptionTier;
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  features: string[];
  limits: Record<string, number | string | boolean>;
}

const FALLBACK_PLANS: PlanResponseItem[] = [
  {
    id: "free-plan",
    name: "無料",
    tier: "free",
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    features: ["基本編集", "ブラウザ処理", "標準サポート"],
    limits: {
      maxProjects: 3,
      maxFileSizeMb: 500,
      teamSeats: 1,
    },
  },
  {
    id: "pro-plan",
    name: "プロ",
    tier: "pro",
    priceMonthly: 150,
    priceYearly: 1980,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? null,
    stripePriceIdYearly:
      process.env.STRIPE_PRICE_PRO_ONETIME ?? process.env.STRIPE_PRICE_PRO_YEARLY ?? null,
    features: ["高度編集", "高速キュー", "優先サポート", "高画質エクスポート"],
    limits: {
      maxProjects: 100,
      maxFileSizeMb: 2048,
      teamSeats: 3,
    },
  },
];

function normalizeFeatures(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, enabled]) =>
      enabled ? key : `${key} (limited)`
    );
  }
  return [];
}

function normalizeLimits(value: unknown): Record<string, number | string | boolean> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, number | string | boolean>;
  }
  return {};
}

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function getStripePriceIdFromEnv(
  tier: SubscriptionTier,
  cycle: "monthly" | "yearly"
): string | null {
  if (tier === "pro") {
    return cycle === "monthly"
      ? process.env.STRIPE_PRICE_PRO_MONTHLY ?? null
      : process.env.STRIPE_PRICE_PRO_ONETIME ?? process.env.STRIPE_PRICE_PRO_YEARLY ?? null;
  }
  return null;
}

export async function GET() {
  const supabaseConfigured = hasSupabaseConfig();
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

  if (!supabaseConfigured) {
    return NextResponse.json({
      source: "fallback",
      supabaseConfigured,
      stripeConfigured,
      plans: FALLBACK_PLANS,
      message: "Supabaseの環境変数が未設定のため、フォールバックプランを返しています。",
    });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("id,name,tier,price_monthly,price_yearly,features,limits,is_active")
      .eq("is_active", true)
      .in("tier", ["free", "pro"])
      .order("price_monthly", { ascending: true });

    if (error || !data || data.length === 0) {
      return NextResponse.json({
        source: "fallback",
        supabaseConfigured,
        stripeConfigured,
        plans: FALLBACK_PLANS,
        message: error?.message ?? "Supabaseに有効なプランが見つかりませんでした。",
      });
    }

    const plans: PlanResponseItem[] = data.map((plan) => ({
      id: plan.id,
      name: plan.name,
      tier: plan.tier,
      priceMonthly: plan.price_monthly,
      priceYearly: plan.price_yearly,
      stripePriceIdMonthly: getStripePriceIdFromEnv(plan.tier, "monthly"),
      stripePriceIdYearly: getStripePriceIdFromEnv(plan.tier, "yearly"),
      features: normalizeFeatures(plan.features),
      limits: normalizeLimits(plan.limits),
    }));

    return NextResponse.json({
      source: "supabase",
      supabaseConfigured,
      stripeConfigured,
      plans,
    });
  } catch (error) {
    return NextResponse.json(
      {
        source: "fallback",
        supabaseConfigured,
        stripeConfigured,
        plans: FALLBACK_PLANS,
        message:
          error instanceof Error
            ? error.message
            : "プラン情報の取得中に予期しないエラーが発生しました。",
      },
      { status: 200 }
    );
  }
}
