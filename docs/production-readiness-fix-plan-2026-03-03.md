# Media Editor Platform Standalone - 本番実装向け修正タスク一覧

作成日: 2026-03-03
対象リポジトリ: `media-editor-platform-standalone`
目的: 本番投入前に、セキュリティ/課金/AI利用制御の重大リスクを解消するための実装タスクを優先順で提示

## 前提
- 本ドキュメントはコードレビュー結果をもとにした実装計画です。
- 工数は「1人実装・既存構成維持・実装中心」の目安です。
- QA/運用監視の本格整備は別途見積もりとします。

## 修正タスク一覧（優先順）

| No | 優先度 | タスク | 主な対象 | 工数目安 | 完了条件 |
|---|---|---|---|---|---|
| 1 | P0 | `users` のRLSを列単位で再設計（tier/credits/stripe系は本人更新禁止） | `supabase/migrations/001_initial_schema.sql`, `supabase/migrations/004_update_pricing_ai_tiers.sql` | 4-6h | クライアントから `subscription_tier` / `ai_credits_remaining` / `stripe_*` を更新できない |
| 2 | P0 | `/api/stripe/portal` を「認証必須 + 本人 `stripe_customer_id` 固定」に変更（bodyの `customerId` 廃止） | `src/app/api/stripe/portal/route.ts` | 2-3h | 未認証アクセス拒否、他人の `cus_...` でセッション生成不可 |
| 3 | P0 | Checkout/Webhookの権限付与をサーバー側価格IDマッピング起点に統一（`planTier` 信頼禁止） | `src/app/api/stripe/checkout/route.ts`, `src/app/api/stripe/webhook/route.ts` | 6-8h | 改ざんmetadataでtier/特典付与が起きない |
| 4 | P0 | `/api/ai/credits` の入力検証強化（整数/正数/上限、負値禁止） | `src/app/api/ai/credits/route.ts` | 2-4h | `credits_consumed <= 0` は 400 で拒否 |
| 5 | P0 | クレジット消費を原子的処理に変更（RPCまたはSQL関数で条件付き減算） | `src/app/api/ai/credits/route.ts`, `supabase/migrations/*` | 4-6h | 同時リクエストでも過剰許可/二重消費なし |
| 6 | P0 | 全AI APIでサーバー側課金ガードを強制（実行前reserve、失敗時refund） | `src/app/api/ai/*` | 8-12h | API直叩きでも残高不足時はAI実行不可 |
| 7 | P1 | Stripe webhook冪等化（`event.id` 保存 + 重複スキップ） | `src/app/api/stripe/webhook/route.ts`, `supabase/migrations/*` | 6-10h | Stripe再送で二重加算しない |
| 8 | P1 | webhookのエラー処理厳格化（DB失敗時の扱い統一、監視ログ追加） | `src/app/api/stripe/webhook/route.ts` | 4-6h | DB失敗がサイレント化しない |
| 9 | P1 | 初回購入時のユーザー紐付け確実化（`client_reference_id` 等の導入） | `src/app/api/stripe/checkout/route.ts`, `src/app/api/stripe/webhook/route.ts` | 4-6h | 初回決済後に確実に対象ユーザーへ反映 |
| 10 | P1 | Origin/CSRF判定を厳密比較へ変更（`includes` 廃止、URL parse + host一致） | `src/lib/api/origin.ts`, `src/proxy.ts` | 4-6h | `victim.com.attacker.tld` 系を拒否 |
| 11 | P2 | AI APIの入力バリデーション追加（prompt長/base64サイズ/mime制限） | `src/app/api/ai/*`, `src/lib/api/validation.ts` | 4-8h | 大容量/異常入力によるコストDoS耐性確保 |
| 12 | P2 | 料金仕様整合（lifetime無制限表示と実装の統一、`subscription.updated` 再付与条件見直し） | `src/app/api/subscription/packages/route.ts`, `src/app/api/stripe/webhook/route.ts`, `docs/subscription-setup.md` | 3-5h | UI/ドキュメント/実装の仕様不一致が解消 |

## 実装順（推奨）
1. P0（No.1-6）を先に完了
2. P1（No.7-10）を次に完了
3. P2（No.11-12）を最後に完了

## 総工数目安
- P0: 26-39h
- P1: 18-28h
- P2: 7-13h
- 合計: 51-80h（約7-10人日）

## 共有用メッセージ（そのまま転送可）
下記順で実装をお願いします。
- 最優先: No.1-6（認可破綻・課金回避・不正利用の直結リスク）
- 次点: No.7-10（Webhook整合性・反映漏れ・Origin/CSRF）
- 最後: No.11-12（DoS耐性・仕様整合）

この計画は 2026-03-03 時点のリポジトリ状態に基づくため、作業着手時に最新 `main` との差分再確認を実施してください。
