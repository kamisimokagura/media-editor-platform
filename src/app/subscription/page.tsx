"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout";
import { useAuth } from "@/components/providers/AuthProvider";
import { ANALYTICS_EVENTS, trackClientEvent, trackPageView } from "@/lib/analytics/client";
import { toast } from "@/stores/toastStore";
import { AI_ENABLED } from "@/lib/featureFlags";

type BillingTab = "monthly" | "yearly" | "one_time";

interface Plan {
  id: string;
  name: string;
  tier: "free" | "pro" | "business" | "enterprise" | "ai_lite" | "ai_pro";
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  features: string[];
  limits: Record<string, number | string | boolean>;
}

interface Package {
  id: string;
  name: string;
  credits: number;
  priceJpy: number;
  stripePriceId: string | null;
}

interface PlansApiResponse {
  source: "supabase" | "fallback";
  supabaseConfigured: boolean;
  stripeConfigured: boolean;
  plans: Plan[];
  message?: string;
}

interface PackagesApiResponse {
  source: "supabase" | "fallback";
  stripeConfigured: boolean;
  packages: Package[];
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
  if (tier === "ai_lite") return 1;
  if (tier === "ai_pro") return 2;
  if (tier === "pro") return 3;
  if (tier === "business") return 4;
  return 5;
}

function yearlyDiscount(monthly: number, yearly: number): number {
  if (monthly <= 0) return 0;
  const annualFromMonthly = monthly * 12;
  if (annualFromMonthly <= yearly) return 0;
  return Math.round(((annualFromMonthly - yearly) / annualFromMonthly) * 100);
}

function SubscriptionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, subscriptionTier, loading } = useAuth();
  const checkoutStatus = searchParams.get("status");
  const trackedCheckoutStatusRef = useRef<string | null>(null);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [source, setSource] = useState<PlansApiResponse["source"]>("fallback");
  const [billingTab, setBillingTab] = useState<BillingTab>("monthly");
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [checkoutTier, setCheckoutTier] = useState<string | null>(null);
  const [checkoutPackageId, setCheckoutPackageId] = useState<string | null>(null);
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

  const loadPackages = useCallback(async () => {
    setIsLoadingPackages(true);
    try {
      const response = await fetch("/api/subscription/packages", { cache: "no-store" });
      const data = (await response.json()) as PackagesApiResponse;
      if (Array.isArray(data.packages)) {
        setPackages(data.packages);
      }
    } catch {
      setPackages([]);
    } finally {
      setIsLoadingPackages(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
    void loadPackages();
  }, [loadPlans, loadPackages]);

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

      const isYearly = billingTab === "yearly";
      const priceId = isYearly ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;
      const checkoutMode = "subscription";
      const billingCycle = isYearly ? "yearly" : "monthly";

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
    [billingTab, router, user]
  );

  const handlePackageCheckout = useCallback(
    async (pkg: Package) => {
      if (!user) {
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent("/subscription")}`);
        return;
      }

      if (!pkg.stripePriceId) {
        toast.error("このパックのStripe価格IDが未設定です。");
        return;
      }

      const packTier = pkg.credits === -1 ? "lifetime" : pkg.name.toLowerCase().replace(" ", "_");

      void trackClientEvent({
        eventName: ANALYTICS_EVENTS.CHECKOUT_START,
        pagePath: "/subscription",
        eventParams: {
          plan_tier: packTier,
          billing_cycle: "one_time",
          price_id: pkg.stripePriceId,
        },
      });

      setCheckoutPackageId(pkg.id);

      try {
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceId: pkg.stripePriceId,
            planTier: packTier,
            billingCycle: "one_time",
            checkoutMode: "payment",
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
        setCheckoutPackageId(null);
      }
    },
    [router, user]
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

  if (!AI_ENABLED) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
        <Header />
        <main className="w-full flex justify-center">
          <div className="w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              AI機能 準備中
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-3">
              AI搭載の画像・動画編集機能を現在開発中です。
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              基本的な編集機能は引き続き無料でご利用いただけます。
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:opacity-95 transition-opacity"
            >
              ホームに戻る
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
      <Header />

      <main className="w-full flex justify-center">
        <div className="w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <section className="text-center mb-10 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              プラン・料金
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
              基本編集は完全無料。AI機能を使いたい時だけアップグレード。
            </p>
          </section>

          <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="inline-flex bg-white dark:bg-dark-800 rounded-2xl p-1.5 shadow">
              {(["monthly", "yearly", "one_time"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setBillingTab(tab)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    billingTab === tab
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                      : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {tab === "monthly" ? "月額" : tab === "yearly" ? "年額" : "買い切り"}
                </button>
              ))}
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

          {billingTab !== "one_time" ? (
            /* Subscription plans */
            isLoadingPlans ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-80 bg-white dark:bg-dark-800 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : plans.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 text-sm text-red-600 dark:text-red-400">
                プランが見つかりません。
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {plans.map((plan) => {
                  const current = currentPlanTier === plan.tier;
                  const price = billingTab === "yearly" ? plan.priceYearly : plan.priceMonthly;
                  const discount = billingTab === "yearly" ? yearlyDiscount(plan.priceMonthly, plan.priceYearly) : 0;
                  const isPopular = plan.tier === "ai_lite";

                  return (
                    <article
                      key={plan.id}
                      className={`rounded-2xl border p-6 bg-white dark:bg-dark-800 relative ${
                        current
                          ? "border-blue-500 shadow-lg shadow-blue-500/10"
                          : isPopular
                            ? "border-purple-400 shadow-lg shadow-purple-500/10"
                            : "border-gray-200 dark:border-dark-700"
                      }`}
                    >
                      {isPopular && !current && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold rounded-full">
                            おすすめ
                          </span>
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{plan.name}</h2>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {plan.tier === "free" ? "基本プラン" : plan.tier === "ai_lite" ? "AI入門" : "AIヘビーユーザー向け"}
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          {current && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              現在
                            </span>
                          )}
                          {discount > 0 && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              {discount}%お得
                            </span>
                          )}
                          {billingTab === "monthly" && plan.tier !== "free" && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              7日間無料
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mb-5">
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatPriceJPY(price)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {billingTab === "monthly" ? "/ 月" : "/ 年"}
                        </p>
                      </div>

                      <ul className="space-y-2 mb-5">
                        {plan.features.slice(0, 5).map((feature, idx) => (
                          <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
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
            )
          ) : (
            /* One-time credit packages */
            isLoadingPackages ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-64 bg-white dark:bg-dark-800 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : packages.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-dark-800 text-sm text-red-600 dark:text-red-400">
                パッケージが見つかりません。
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {packages.map((pkg) => {
                  const isLifetime = pkg.credits === -1;
                  return (
                    <article
                      key={pkg.id}
                      className={`rounded-2xl border p-6 bg-white dark:bg-dark-800 ${
                        isLifetime
                          ? "border-purple-400 shadow-lg shadow-purple-500/10"
                          : "border-gray-200 dark:border-dark-700"
                      }`}
                    >
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{pkg.name}</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {isLifetime ? "無制限" : `${pkg.credits.toLocaleString()} クレジット`}
                      </p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                        {formatPriceJPY(pkg.priceJpy)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
                        {isLifetime
                          ? "一度の購入で永久利用"
                          : `1クレジットあたり ${formatPriceJPY(Math.round(pkg.priceJpy / pkg.credits))}`}
                      </p>

                      {isLifetime && (
                        <div className="mb-4 p-2.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-xs text-purple-700 dark:text-purple-300">
                          全AI機能が無制限で使い放題
                        </div>
                      )}

                      <button
                        onClick={() => void handlePackageCheckout(pkg)}
                        disabled={loading || checkoutPackageId === pkg.id || !stripeConfigured}
                        className={`w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 ${
                          isLifetime
                            ? "bg-gradient-to-r from-purple-600 to-pink-600"
                            : "bg-gradient-to-r from-blue-600 to-purple-600"
                        }`}
                      >
                        {checkoutPackageId === pkg.id
                          ? "決済ページへ移動中..."
                          : !stripeConfigured
                            ? "Stripe未設定"
                            : "購入する"}
                      </button>
                    </article>
                  );
                })}
              </div>
            )
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
            プラン取得元: <span className="font-medium">{source === "supabase" ? "Supabase" : "フォールバック"}</span>
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
              <div key={i} className="h-80 bg-white dark:bg-dark-800 rounded-2xl animate-pulse" />
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
