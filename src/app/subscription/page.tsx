"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout";
import { useAuth } from "@/components/providers/AuthProvider";
import { ANALYTICS_EVENTS, trackClientEvent, trackPageView } from "@/lib/analytics/client";
import { toast } from "@/stores/toastStore";

type BillingCycle = "monthly" | "one_time";

interface Plan {
  id: string;
  name: string;
  tier: "free" | "pro" | "business" | "enterprise";
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  features: string[];
  limits: Record<string, number | string | boolean>;
}

interface PlansApiResponse {
  source: "supabase" | "fallback";
  supabaseConfigured: boolean;
  stripeConfigured: boolean;
  plans: Plan[];
  message?: string;
}

function formatPriceJPY(price: number) {
  if (price <= 0) return "\u00A50";
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(price);
}

function tierRank(tier: Plan["tier"]) {
  if (tier === "free") return 0;
  if (tier === "pro") return 1;
  if (tier === "business") return 2;
  return 3;
}

function formatTierLabel(tier: Plan["tier"]) {
  if (tier === "free") return "無料";
  if (tier === "pro") return "プロ";
  if (tier === "business") return "ビジネス";
  return "エンタープライズ";
}

function formatPlanSource(source: PlansApiResponse["source"]) {
  return source === "supabase" ? "Supabase" : "フォールバック";
}

function SubscriptionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, subscriptionTier, loading } = useAuth();
  const checkoutStatus = searchParams.get("status");
  const trackedCheckoutStatusRef = useRef<string | null>(null);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [source, setSource] = useState<PlansApiResponse["source"]>("fallback");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [checkoutTier, setCheckoutTier] = useState<string | null>(null);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setIsLoadingPlans(true);
    setApiMessage(null);

    try {
      const response = await fetch("/api/subscription/plans", { cache: "no-store" });
      const data = (await response.json()) as PlansApiResponse;

      if (!response.ok || !Array.isArray(data.plans)) {
        throw new Error(data?.message || "プラン情報の取得に失敗しました。");
      }

      const sortedPlans = [...data.plans].sort((a, b) => tierRank(a.tier) - tierRank(b.tier));
      setPlans(sortedPlans);
      setSource(data.source);
      setStripeConfigured(data.stripeConfigured);
      setSupabaseConfigured(data.supabaseConfigured);
      setApiMessage(data.message ?? null);
    } catch (error) {
      console.error(error);
      toast.error("サブスクリプションプランの読み込みに失敗しました。");
      setPlans([]);
      setApiMessage(error instanceof Error ? error.message : "プラン情報の取得に失敗しました。");
    } finally {
      setIsLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    void trackPageView("/subscription");
  }, []);

  useEffect(() => {
    if (!checkoutStatus || trackedCheckoutStatusRef.current === checkoutStatus) {
      return;
    }

    trackedCheckoutStatusRef.current = checkoutStatus;

    if (checkoutStatus === "success") {
      void trackClientEvent({
        eventName: ANALYTICS_EVENTS.PURCHASE_COMPLETE,
        pagePath: "/subscription",
        eventParams: {
          source: "stripe_return",
        },
      });
    }
  }, [checkoutStatus]);

  const currentPlanTier = useMemo(() => subscriptionTier ?? "free", [subscriptionTier]);

  const handleCheckout = useCallback(
    async (plan: Plan) => {
      if (!user) {
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent("/subscription")}`);
        return;
      }

      const priceId =
        billingCycle === "monthly" ? plan.stripePriceIdMonthly : plan.stripePriceIdYearly;
      const checkoutMode = billingCycle === "monthly" ? "subscription" : "payment";

      if (!priceId) {
        toast.error("このプランのStripe価格IDが未設定です。");
        return;
      }

      void trackClientEvent({
        eventName: ANALYTICS_EVENTS.CHECKOUT_START,
        pagePath: "/subscription",
        eventParams: {
          plan_tier: plan.tier,
          billing_cycle: billingCycle,
          price_id: priceId,
        },
      });

      setCheckoutTier(plan.tier);

      try {
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceId,
            planTier: plan.tier,
            billingCycle,
            checkoutMode,
            customerEmail: user.email,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result?.error || "チェックアウトセッションの作成に失敗しました。");
        }

        if (result.url) {
          window.location.href = result.url;
          return;
        }

        throw new Error("チェックアウトURLが取得できませんでした。");
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "決済処理の開始に失敗しました。");
      } finally {
        setCheckoutTier(null);
      }
    },
    [billingCycle, router, user]
  );

  const handleOpenPortal = useCallback(async () => {
    if (!user) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent("/subscription")}`);
      return;
    }

    setIsOpeningPortal(true);

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "請求ポータルを開けませんでした。");
      }

      if (result.url) {
        window.location.href = result.url;
        return;
      }

      throw new Error("請求ポータルURLが取得できませんでした。");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "請求ポータルを開けませんでした。");
    } finally {
      setIsOpeningPortal(false);
    }
  }, [router, user]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
      <Header />

      <main className="w-full flex justify-center">
        <div className="w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <section className="text-center mb-10 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              サブスクリプション
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
              プランを選択してください。決済はStripeを利用し、プラン情報は利用可能な場合Supabaseと同期されます。
            </p>
          </section>

          <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="inline-flex bg-white dark:bg-dark-800 rounded-2xl p-1.5 shadow">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  billingCycle === "monthly"
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                    : "text-gray-600 dark:text-gray-300"
                }`}
              >
                月額プラン
              </button>
              <button
                onClick={() => setBillingCycle("one_time")}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  billingCycle === "one_time"
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                    : "text-gray-600 dark:text-gray-300"
                }`}
              >
                買い切りプラン
              </button>
            </div>

            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              <span className="inline-flex items-center gap-2 mr-4">
                <span className={`w-2.5 h-2.5 rounded-full ${supabaseConfigured ? "bg-green-500" : "bg-amber-500"}`} />
                Supabase: {supabaseConfigured ? "接続済み" : "フォールバック中"}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${stripeConfigured ? "bg-green-500" : "bg-amber-500"}`} />
                Stripe: {stripeConfigured ? "接続済み" : "未設定"}
              </span>
            </div>
          </section>

          {apiMessage && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 text-sm">
              {apiMessage}
            </div>
          )}

          {isLoadingPlans ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-72 bg-white dark:bg-dark-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 text-sm text-red-600 dark:text-red-400">
              プランが見つかりません。Supabaseの`subscription_plans`またはフォールバック設定を確認してください。
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {plans.map((plan) => {
                const current = currentPlanTier === plan.tier;
                const price = billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly;

                return (
                  <article
                    key={plan.id}
                    className={`rounded-2xl border p-6 bg-white dark:bg-dark-800 ${
                      current
                        ? "border-blue-500 shadow-lg shadow-blue-500/10"
                        : "border-gray-200 dark:border-dark-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{plan.name}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{formatTierLabel(plan.tier)}</p>
                      </div>
                      {current && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          現在のプラン
                        </span>
                      )}
                    </div>

                    <div className="mb-5">
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatPriceJPY(price)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {billingCycle === "monthly" ? "/ 月" : "買い切り"}
                      </p>
                    </div>

                    <ul className="space-y-2 mb-5">
                      {plan.features.slice(0, 5).map((feature, idx) => (
                        <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mb-5 p-3 rounded-xl bg-gray-50 dark:bg-dark-700 text-xs text-gray-600 dark:text-gray-300">
                      {Object.entries(plan.limits).length === 0 ? (
                        <span>明示的な利用制限はありません。</span>
                      ) : (
                        <div className="space-y-1">
                          {Object.entries(plan.limits).map(([key, value]) => (
                            <p key={key}>
                              {key}: {String(value)}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {plan.tier === "free" ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400"
                      >
                        無料プラン
                      </button>
                    ) : (
                      <button
                        onClick={() => void handleCheckout(plan)}
                        disabled={loading || checkoutTier === plan.tier || !stripeConfigured}
                        className="w-full py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 disabled:opacity-50"
                      >
                        {checkoutTier === plan.tier
                          ? "決済ページへ移動中..."
                          : !stripeConfigured
                            ? "Stripe未設定"
                            : `${plan.name}を選択`}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          <section className="mt-10 sm:mt-12 rounded-2xl bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">請求情報の管理</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  支払い方法の更新や解約は、Stripeの請求ポータルから行えます。
                </p>
              </div>
              <button
                onClick={() => void handleOpenPortal()}
                disabled={isOpeningPortal || !stripeConfigured}
                className="px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-700 disabled:opacity-50"
              >
                {isOpeningPortal ? "開いています..." : "請求ポータルを開く"}
              </button>
            </div>
          </section>

          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            プラン取得元: <span className="font-medium">{formatPlanSource(source)}</span>
          </p>
        </div>
      </main>
    </div>
  );
}

function SubscriptionPageFallback() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
      <Header />
      <main className="w-full flex justify-center">
        <div className="w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-72 bg-white dark:bg-dark-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<SubscriptionPageFallback />}>
      <SubscriptionPageContent />
    </Suspense>
  );
}

