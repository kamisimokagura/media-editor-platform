"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { ANALYTICS_EVENTS, trackClientEvent, trackPageView } from "@/lib/analytics/client";
import { toast } from "@/stores/toastStore";

const socialProviders = [
  {
    id: "google",
    name: "Google",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
  },
  {
    id: "github",
    name: "GitHub",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path
          fillRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

function SignInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { signIn, signInWithEmail, signUp } = useAuth();

  const callbackUrlParam = searchParams.get("callbackUrl");
  const callbackUrl =
    callbackUrlParam &&
    callbackUrlParam.startsWith("/") &&
    !callbackUrlParam.startsWith("//")
      ? callbackUrlParam
      : "/";
  const error = searchParams.get("error");

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    void trackPageView("/auth/signin");
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "signup") {
        void trackClientEvent({
          eventName: ANALYTICS_EVENTS.SIGNUP_START,
          pagePath: "/auth/signin",
          eventParams: { method: "email_password" },
        });
        const { requiresEmailVerification } = await signUp(email, password, fullName);
        void trackClientEvent({
          eventName: ANALYTICS_EVENTS.SIGNUP_COMPLETE,
          pagePath: "/auth/signin",
          eventParams: { method: "email_password" },
        });
        if (requiresEmailVerification) {
          toast.success("確認メールを送信しました。メールを確認してください。");
        } else {
          toast.success("アカウント登録が完了しました。");
          router.push(callbackUrl);
        }
      } else {
        await signInWithEmail(email, password);
        void trackClientEvent({
          eventName: ANALYTICS_EVENTS.SIGNIN_COMPLETE,
          pagePath: "/auth/signin",
          eventParams: { method: "email_password" },
        });
        router.push(callbackUrl);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      toast.error(err.message || "ログインに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: string) => {
    try {
      setIsLoading(true);
      await signIn(provider, callbackUrl);
    } catch (err: any) {
      console.error("Social sign in error:", err);
      toast.error(err.message || "ソーシャルログインに失敗しました");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg">
      <div className="bg-white dark:bg-dark-800 rounded-3xl shadow-xl p-6 sm:p-8 lg:p-10">
        <div className="text-center mb-8 sm:mb-10">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <span className="font-bold text-2xl text-gray-900 dark:text-white">MediaEditor</span>
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {mode === "signin" ? "ログイン" : "新規登録"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {mode === "signin"
              ? "アカウントにログインして続行してください"
              : "アカウントを作成して開始しましょう"}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-700 dark:text-red-300">{decodeURIComponent(error)}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-7">
          {socialProviders.map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleSocialSignIn(provider.id)}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 dark:border-dark-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors disabled:opacity-50"
            >
              {provider.icon}
              <span className="text-sm font-medium">{provider.name}</span>
            </button>
          ))}
        </div>

        <div className="relative mb-7">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-dark-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white dark:bg-dark-800 text-gray-500 dark:text-gray-400">
              または
            </span>
          </div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-5">
          {mode === "signup" && (
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                お名前
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-dark-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-700 dark:text-white transition-all"
                placeholder="山田 太郎"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-dark-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-700 dark:text-white transition-all"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              パスワード
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-200 dark:border-dark-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-700 dark:text-white transition-all"
                placeholder="••••••••"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showPassword ? "非表示" : "表示"}
              </button>
            </div>
            {mode === "signup" && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">8文字以上で入力してください</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "処理中..." : mode === "signin" ? "ログイン" : "新規登録"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          {mode === "signin" ? "アカウントをお持ちでないですか？ " : "すでにアカウントをお持ちですか？ "}
          <button
            onClick={() => setMode((prev) => (prev === "signin" ? "signup" : "signin"))}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
          >
            {mode === "signin" ? "新規登録" : "ログイン"}
          </button>
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
        続行することで <Link href="/terms" className="text-blue-600 hover:underline">利用規約</Link> と{" "}
        <Link href="/privacy" className="text-blue-600 hover:underline">プライバシーポリシー</Link> に同意したものとみなします。
      </p>

      <div className="mt-4 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="w-full max-w-lg">
      <div className="bg-white dark:bg-dark-800 rounded-3xl shadow-xl p-8 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-40 mx-auto mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-7">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl mb-4" />
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl mb-4" />
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-dark-950 dark:via-dark-900 dark:to-slate-900 px-4 py-10 sm:py-14">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-80 sm:w-96 h-80 sm:h-96 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 sm:w-80 h-72 sm:h-80 bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl" />
      </div>

      <Suspense fallback={<LoadingFallback />}>
        <SignInContent />
      </Suspense>
    </div>
  );
}
