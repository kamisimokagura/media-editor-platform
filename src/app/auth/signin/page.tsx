"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { toast } from "@/stores/toastStore";

// Social provider configurations
const socialProviders = [
  {
    id: "google",
    name: "Google",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
    color: "hover:bg-red-50 dark:hover:bg-red-900/20",
  },
  {
    id: "github",
    name: "GitHub",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
      </svg>
    ),
    color: "hover:bg-gray-100 dark:hover:bg-gray-800",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: (
      <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    color: "hover:bg-blue-50 dark:hover:bg-blue-900/20",
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    color: "hover:bg-gray-100 dark:hover:bg-gray-800",
  },
  {
    id: "azure",
    name: "LINE",
    icon: (
      <svg className="w-5 h-5 text-[#00B900]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
      </svg>
    ),
    color: "hover:bg-green-50 dark:hover:bg-green-900/20",
  },
];

function SignInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { signIn, signInWithEmail, signUp, loading: authLoading } = useAuth();

  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const error = searchParams.get("error");

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "signup") {
        await signUp(email, password, fullName);
        toast.success("確認メールを送信しました。メールを確認してください。");
      } else {
        await signInWithEmail(email, password);
        router.push(callbackUrl);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      toast.error(err.message || "認証エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: string) => {
    try {
      setIsLoading(true);
      await signIn(provider);
    } catch (err: any) {
      console.error("Social sign in error:", err);
      toast.error(err.message || "ソーシャルログインに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full">
      {/* Card container */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-40 group-hover:opacity-70 transition-opacity" />
              <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <span className="font-bold text-2xl bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              MediaEditor
            </span>
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {mode === "signin" ? "おかえりなさい" : "アカウントを作成"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {mode === "signin"
              ? "アカウントにログインしてプロジェクトを管理"
              : "無料でアカウントを作成して始めましょう"}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700 dark:text-red-300">
                {decodeURIComponent(error)}
              </p>
            </div>
          </div>
        )}

        {/* Social login buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {socialProviders.slice(0, 4).map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleSocialSignIn(provider.id)}
              disabled={isLoading}
              className={`flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 dark:border-dark-600 rounded-xl text-gray-700 dark:text-gray-300 transition-all duration-200 disabled:opacity-50 ${provider.color}`}
            >
              {provider.icon}
              <span className="text-sm font-medium">{provider.name}</span>
            </button>
          ))}
        </div>

        {/* LINE button (full width) */}
        <button
          onClick={() => handleSocialSignIn("azure")}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 dark:border-dark-600 rounded-xl text-gray-700 dark:text-gray-300 transition-all duration-200 disabled:opacity-50 hover:bg-green-50 dark:hover:bg-green-900/20 mb-6"
        >
          {socialProviders[4].icon}
          <span className="text-sm font-medium">LINEでログイン</span>
        </button>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-dark-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white dark:bg-dark-800 text-gray-500 dark:text-gray-400">
              または
            </span>
          </div>
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
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
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {mode === "signup" && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                8文字以上で設定してください
              </p>
            )}
          </div>

          {mode === "signin" && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">ログイン状態を保持</span>
              </label>
              <button type="button" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
                パスワードを忘れた？
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                処理中...
              </span>
            ) : mode === "signin" ? (
              "ログイン"
            ) : (
              "アカウントを作成"
            )}
          </button>
        </form>

        {/* Toggle mode */}
        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          {mode === "signin" ? (
            <>
              アカウントをお持ちでない方は{" "}
              <button
                onClick={() => setMode("signup")}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
              >
                新規登録
              </button>
            </>
          ) : (
            <>
              既にアカウントをお持ちの方は{" "}
              <button
                onClick={() => setMode("signin")}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
              >
                ログイン
              </button>
            </>
          )}
        </p>
      </div>

      {/* Terms */}
      <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
        ログインすることで、
        <a href="/terms" className="text-blue-600 hover:underline">利用規約</a>
        および
        <a href="/privacy" className="text-blue-600 hover:underline">プライバシーポリシー</a>
        に同意したものとみなされます。
      </p>

      {/* Back to home */}
      <div className="mt-4 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
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
    <div className="max-w-md w-full">
      <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl p-8 animate-pulse">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl mx-auto mb-6" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto mb-2" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 mx-auto" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl mb-6" />
        <div className="space-y-4">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-dark-950 dark:via-dark-900 dark:to-slate-900 py-12 px-4">
      {/* Background decorations */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl" />
      </div>

      <Suspense fallback={<LoadingFallback />}>
        <SignInContent />
      </Suspense>
    </div>
  );
}
