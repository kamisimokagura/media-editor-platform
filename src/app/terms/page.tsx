import Link from "next/link";
import { Header } from "@/components/layout";

export const metadata = {
  title: "利用規約",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
      <Header />

      <main className="w-full flex justify-center">
        <article className="w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">利用規約</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-8">
            最終更新日: 2026-02-12
          </p>

          <section className="space-y-6 text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">1. 適用</h2>
              <p>本規約は本サービスの利用に関する条件を定めるものです。利用者は本規約に同意のうえ利用します。</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">2. アカウント</h2>
              <p>
                登録情報は正確に保つ必要があります。アカウント管理不備により生じた損害は、当社に故意または重過失がない限り責任を負いません。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">3. 禁止事項</h2>
              <p>
                法令違反、公序良俗違反、第三者権利侵害、不正アクセス、サービス運営妨害行為を禁止します。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">4. 料金・サブスクリプション</h2>
              <p>
                有料プランは別途表示された料金・課金周期に従います。決済は外部決済事業者を通じて処理されます。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">5. 免責</h2>
              <p>
                本サービスは現状有姿で提供されます。継続性・完全性・特定目的適合性を保証するものではありません。
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">6. 関連文書</h2>
              <p>
                個人情報の取扱いは
                <Link href="/privacy" className="text-blue-600 hover:underline ml-1">
                  プライバシーポリシー
                </Link>
                に従います。
              </p>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}
