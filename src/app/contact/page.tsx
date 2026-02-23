"use client";

import { useState } from "react";
import { Header } from "@/components/layout";
import { toast } from "@/stores/toastStore";

const CONTACT_EMAIL = "kamigaminosinri@gmail.com";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          message,
        }),
      });

      if (!response.ok) {
        let errorMessage = "送信に失敗しました。時間を置いて再度お試しください。";
        try {
          const data = (await response.json()) as { error?: string };
          if (typeof data.error === "string" && data.error.length > 0) {
            errorMessage = data.error;
          }
        } catch {
          // Keep fallback message when response body is not JSON.
        }
        throw new Error(errorMessage);
      }

      toast.success("お問い合わせを送信しました。");
      setName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "送信に失敗しました。");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
      <Header />

      <main className="w-full flex justify-center">
        <div className="w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">お問い合わせ</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-8">
            バグ報告、機能要望、契約・請求に関する相談を受け付けています。
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
            <form
              onSubmit={handleSubmit}
              className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-dark-700 p-5 sm:p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  お名前
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  お問い合わせ内容
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 disabled:opacity-50"
              >
                {sending ? "送信中..." : "送信する"}
              </button>
            </form>

            <aside className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-dark-700 p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">連絡先</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                緊急時や長文の相談はメールでご連絡ください。
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center px-4 py-2 rounded-xl bg-gray-100 dark:bg-dark-700 text-sm text-gray-800 dark:text-gray-200"
              >
                {CONTACT_EMAIL}
              </a>

              <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 space-y-2">
                <p>受付時間: 平日 10:00-18:00 (JST)</p>
                <p>通常返信: 1-2営業日</p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
