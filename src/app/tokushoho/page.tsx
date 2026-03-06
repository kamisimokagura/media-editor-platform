import Link from "next/link";
import { Header } from "@/components/layout";

export const metadata = {
  title: "特定商取引法に基づく表記",
};

export default function TokushohoPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />

      <main className="w-full flex justify-center">
        <article className="w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <h1 className="text-3xl font-bold font-[family-name:var(--font-poppins)] text-[var(--color-text)] mb-3">
            特定商取引法に基づく表記
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mb-8">
            最終更新日: 2026-03-04
          </p>

          <section className="space-y-6 text-sm sm:text-base text-[var(--color-text-muted)] leading-relaxed">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody className="divide-y divide-[var(--color-border)]">
                  <Row label="販売業者" value="MediEdi！" />
                  <Row label="運営統括責任者" value="RADITYAWAN AL MUFLICH" />
                  <Row
                    label="所在地"
                    value="請求があった場合に遅滞なく開示いたします"
                  />
                  <Row
                    label="電話番号"
                    value="請求があった場合に遅滞なく開示いたします"
                  />
                  <Row label="メールアドレス" value="kamigaminosinri@gmail.com" />
                  <Row
                    label="販売URL"
                    value={
                      <Link
                        href="/"
                        className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
                      >
                        https://medieditor.vercel.app
                      </Link>
                    }
                  />
                  <Row
                    label="販売価格"
                    value={
                      <>
                        各プラン・パッケージの価格はサービス内の
                        <Link
                          href="/subscription"
                          className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] mx-1"
                        >
                          料金ページ
                        </Link>
                        に表示されたとおりです。すべて税込価格です。
                      </>
                    }
                  />
                  <Row
                    label="追加手数料"
                    value="サービス利用にかかるインターネット接続料金・通信料金はお客様のご負担となります。"
                  />
                  <Row
                    label="支払方法"
                    value="クレジットカード（Visa, Mastercard, American Express, JCB）※ Stripe を通じた決済"
                  />
                  <Row
                    label="支払時期"
                    value="サブスクリプション：申込み時および毎月の更新日に自動課金。クレジットパック：購入時に即時課金。"
                  />
                  <Row
                    label="サービス提供時期"
                    value="決済完了後、直ちにサービスをご利用いただけます。"
                  />
                  <Row
                    label="返品・キャンセル"
                    value={
                      <>
                        サブスクリプションはいつでもキャンセル可能です。キャンセル後は現在の請求期間の終了まで引き続きご利用いただけます。
                        デジタルコンテンツの性質上、AIクレジットパックの購入後の返金は原則としてお受けしておりません。
                        サービスに重大な不具合があった場合は個別にご相談ください。
                      </>
                    }
                  />
                  <Row
                    label="動作環境"
                    value="Google Chrome, Firefox, Safari, Microsoft Edge の最新版。インターネット接続が必要です。"
                  />
                  <Row
                    label="特別条件"
                    value={
                      <>
                        ご利用にあたっては
                        <Link
                          href="/terms"
                          className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] mx-1"
                        >
                          利用規約
                        </Link>
                        および
                        <Link
                          href="/privacy"
                          className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] mx-1"
                        >
                          プライバシーポリシー
                        </Link>
                        に同意いただく必要があります。
                      </>
                    }
                  />
                </tbody>
              </table>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <tr>
      <th className="py-4 pr-4 text-left align-top font-semibold text-[var(--color-text)] whitespace-nowrap w-40">
        {label}
      </th>
      <td className="py-4">{value}</td>
    </tr>
  );
}
