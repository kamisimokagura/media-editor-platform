"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, string> = {
    Configuration: "サーバー設定にエラーがあります。管理者にお問い合わせください。",
    AccessDenied: "アクセスが拒否されました。",
    Verification: "認証リンクの有効期限が切れています。",
    Default: "認証中にエラーが発生しました。",
  };

  const message = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default;

  return (
    <>
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg
          className="w-8 h-8 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        認証エラー
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">{message}</p>

      <div className="space-y-3">
        <Link href="/auth/signin">
          <Button variant="primary" className="w-full">
            サインインに戻る
          </Button>
        </Link>
        <Link href="/">
          <Button variant="ghost" className="w-full">
            ホームに戻る
          </Button>
        </Link>
      </div>
    </>
  );
}

function LoadingFallback() {
  return (
    <div className="animate-pulse">
      <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-6" />
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto mb-4" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 mx-auto mb-8" />
      <div className="space-y-3">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-950 py-12 px-4">
      <div className="max-w-md w-full text-center">
        <Suspense fallback={<LoadingFallback />}>
          <ErrorContent />
        </Suspense>
      </div>
    </div>
  );
}
