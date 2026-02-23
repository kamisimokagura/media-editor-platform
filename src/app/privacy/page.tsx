import Link from "next/link";
import { Header } from "@/components/layout";

export const metadata = {
  title: "プライバシーポリシー",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
      <Header />

      <main className="w-full flex justify-center">
        <article className="w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">プライバシーポリシー</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-8">
            最終更新日: 2026-02-12
          </p>

          <section className="space-y-6 text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">1. 取得する情報</h2>
              <p>
                アカウント登録時にメールアドレス、認証プロバイダ情報、利用ログ、課金処理に必要な識別子（例:
                Stripe customer ID）を取得する場合があります。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">2. 利用目的</h2>
              <p>
                サービス提供、認証、サポート対応、品質改善、不正利用防止、課金処理、および法令対応のために利用します。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">3. 第三者提供</h2>
              <p>
                法令に基づく場合を除き、本人同意なく第三者提供しません。決済・認証など必要な外部サービスと連携する場合があります。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">4. データ保持</h2>
              <p>
                利用目的達成に必要な期間のみ保持し、不要になった情報は適切に削除または匿名化します。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">5. お問い合わせ</h2>
              <p>
                本ポリシーに関する問い合わせは
                <Link href="/contact" className="text-blue-600 hover:underline ml-1">
                  お問い合わせページ
                </Link>
                からご連絡ください。
              </p>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}
