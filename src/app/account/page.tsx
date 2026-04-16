"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout";
import { useAuth } from "@/components/providers/AuthProvider";
import { AI_ENABLED } from "@/lib/featureFlags";
import {
  User,
  EnvelopeSimple,
  CalendarBlank,
  Lightning,
  SignOut,
  ArrowLeft,
} from "@phosphor-icons/react";

interface UsageData {
  tier: string;
  credits_remaining: number;
  credits_limit: number;
  reset_at: string | null;
}

const TIER_LABELS: Record<string, string> = {
  free: "フリー",
  ai_lite: "AI Lite",
  ai_pro: "AI Pro",
};

export default function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin?callbackUrl=/account");
    }
  }, [user, loading, router]);

  // Fetch credit usage when AI is enabled
  useEffect(() => {
    if (!user || !AI_ENABLED) return;
    const fetchUsage = async () => {
      setUsageLoading(true);
      try {
        const r = await fetch("/api/ai/usage");
        const data = await r.json();
        setUsage(data);
      } catch {
        // ignore
      } finally {
        setUsageLoading(false);
      }
    };
    void fetchUsage();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <Header />
        <div
          className="flex items-center justify-center"
          style={{ minHeight: "calc(100vh - 56px)" }}
        >
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const fullName = (user.user_metadata?.full_name as string | undefined) ?? "";
  const displayName = fullName || user.email?.split("@")[0] || "ユーザー";
  const initial = displayName[0]?.toUpperCase() ?? "U";
  const createdAt = user.created_at
    ? new Date(user.created_at).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const creditPct =
    usage && usage.credits_limit > 0
      ? Math.max(
          0,
          Math.min(100, (usage.credits_remaining / usage.credits_limit) * 100),
        )
      : 0;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />

      <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-12">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          戻る
        </button>

        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-8">
          アカウント
        </h1>

        {/* ── Profile card ── */}
        <div
          className="rounded-2xl border border-[var(--color-border)] overflow-hidden mb-4"
          style={{ background: "var(--color-surface)" }}
        >
          {/* Avatar + name */}
          <div className="p-6 flex items-center gap-5 border-b border-[var(--color-border)]">
            {avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-16 h-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center text-white text-2xl font-bold">
                {initial}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-lg font-semibold text-[var(--color-text)] truncate">
                {displayName}
              </p>
              {fullName && (
                <p className="text-sm text-[var(--color-text-muted)] truncate">
                  {fullName}
                </p>
              )}
            </div>
          </div>

          {/* Info rows */}
          <div className="divide-y divide-[var(--color-border)]">
            <div className="flex items-center gap-4 px-6 py-4">
              <EnvelopeSimple
                size={18}
                className="text-[var(--color-text-muted)] shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs text-[var(--color-text-muted)] mb-0.5">
                  メールアドレス
                </p>
                <p className="text-sm text-[var(--color-text)] truncate">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 px-6 py-4">
              <User
                size={18}
                className="text-[var(--color-text-muted)] shrink-0"
              />
              <div>
                <p className="text-xs text-[var(--color-text-muted)] mb-0.5">
                  ユーザーID
                </p>
                <p className="text-sm text-[var(--color-text)] font-mono break-all">
                  {user.id}
                </p>
              </div>
            </div>

            {createdAt && (
              <div className="flex items-center gap-4 px-6 py-4">
                <CalendarBlank
                  size={18}
                  className="text-[var(--color-text-muted)] shrink-0"
                />
                <div>
                  <p className="text-xs text-[var(--color-text-muted)] mb-0.5">
                    登録日
                  </p>
                  <p className="text-sm text-[var(--color-text)]">
                    {createdAt}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Credits card (AI_ENABLED のみ) ── */}
        {AI_ENABLED && (
          <div
            className="rounded-2xl border border-[var(--color-border)] overflow-hidden mb-4"
            style={{ background: "var(--color-surface)" }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lightning
                    size={18}
                    weight="fill"
                    className="text-[var(--color-accent)]"
                  />
                  <span className="text-sm font-semibold text-[var(--color-text)]">
                    AIクレジット
                  </span>
                </div>
                {usage && (
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{
                      background: "var(--color-accent-soft)",
                      color: "var(--color-accent-text)",
                    }}
                  >
                    {TIER_LABELS[usage.tier] ?? usage.tier}プラン
                  </span>
                )}
              </div>

              {usageLoading ? (
                <div className="h-12 rounded-xl bg-[var(--color-border)] animate-pulse" />
              ) : usage ? (
                <>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-3xl font-bold text-[var(--color-text)]">
                      {usage.credits_remaining.toLocaleString()}
                    </span>
                    <span className="text-sm text-[var(--color-text-muted)]">
                      / {usage.credits_limit.toLocaleString()} クレジット残り
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 rounded-full bg-[var(--color-border)] overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${creditPct}%`,
                        background:
                          creditPct > 30
                            ? "linear-gradient(90deg, #9333ea, #a855f7)"
                            : creditPct > 10
                              ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                              : "linear-gradient(90deg, #ef4444, #f87171)",
                      }}
                    />
                  </div>

                  {usage.reset_at && (
                    <p className="text-xs text-[var(--color-text-muted)]">
                      リセット日:{" "}
                      {new Date(usage.reset_at).toLocaleDateString("ja-JP", {
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">
                  クレジット情報を取得できませんでした
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Danger zone ── */}
        <div
          className="rounded-2xl border border-[var(--color-border)] overflow-hidden"
          style={{ background: "var(--color-surface)" }}
        >
          <div className="px-6 py-4">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 text-sm font-medium text-red-500 hover:text-red-400 transition-colors"
            >
              <SignOut size={16} />
              ログアウト
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
