# Media Editor Platform Standalone - GitHub Issue 一括テンプレート

作成日: 2026-03-03  
対象: `media-editor-platform-standalone`  
元ドキュメント: `docs/production-readiness-fix-plan-2026-03-03.md`

## 使い方
1. 下記の各Issueを1件ずつGitHub Issueとして作成
2. タイトル先頭に `[P0]` / `[P1]` / `[P2]` を付与
3. ラベルは末尾の `推奨ラベル` を設定
4. 実装順は `P0 -> P1 -> P2`

---

## Issue 01
**タイトル**  
`[P0] users RLS再設計: tier/credits/stripe系の本人更新禁止`

**背景**  
現状のRLSでは、認証済みユーザーが自身レコードの重要列を更新できる可能性がある。`subscription_tier` / `ai_credits_remaining` / `stripe_*` の改ざんリスクがあるため、本番前に封じる必要がある。

**対応内容**
- `users` テーブルの UPDATE ポリシーを列責務で分離
- ユーザー自己更新を許可する列を明示的に限定
- 課金・権限列はサーバー/管理経由のみ更新可能に変更
- 既存クライアント更新処理が壊れないよう確認

**受け入れ条件**
- クライアントから `subscription_tier` / `ai_credits_remaining` / `stripe_*` を更新できない
- プロフィール等の許可列は従来どおり更新できる
- RLSポリシー変更後の主要フローで権限エラーが発生しない

**対象ファイル**
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/004_update_pricing_ai_tiers.sql`

**見積**  
4-6h

**推奨ラベル**  
`security`, `supabase`, `backend`, `priority:P0`

---

## Issue 02
**タイトル**  
`[P0] Stripe Portal保護: 認証必須 + customerId入力廃止`

**背景**  
`/api/stripe/portal` で外部入力 `customerId` を利用すると、IDORで他ユーザーのStripe Portalセッションを作成できるリスクがある。

**対応内容**
- `/api/stripe/portal` を認証必須化
- request body の `customerId` を廃止または無視
- DB上のログインユーザー紐付け `stripe_customer_id` のみ使用
- エラーレスポンスを一貫化（未認証/未紐付け）

**受け入れ条件**
- 未認証では必ず 401/403
- 他人の `cus_...` を渡してもセッション発行不可
- 自分の `stripe_customer_id` のみでPortal遷移可能

**対象ファイル**
- `src/app/api/stripe/portal/route.ts`

**見積**  
2-3h

**推奨ラベル**  
`security`, `stripe`, `api`, `priority:P0`

---

## Issue 03
**タイトル**  
`[P0] Checkout/Webhook権限付与の再設計: metadata信頼禁止`

**背景**  
`planTier` などのクライアント由来データをWebhookで信頼すると、プラン昇格の改ざん余地が残る。

**対応内容**
- Checkoutで受ける `priceId` をサーバー側許可リストで検証
- Webhook側は `line_items.price` などStripeの確定情報から権限決定
- `metadata.plan_tier` 依存を撤廃
- 価格ID -> tier/付与クレジット の単一マッピングをサーバー管理

**受け入れ条件**
- 改ざんmetadataで tier/credits を変えられない
- 許可されていない `priceId` はCheckoutで拒否
- Webhook結果が価格IDマッピングと一貫する

**対象ファイル**
- `src/app/api/stripe/checkout/route.ts`
- `src/app/api/stripe/webhook/route.ts`

**見積**  
6-8h

**推奨ラベル**  
`security`, `stripe`, `billing`, `priority:P0`

---

## Issue 04
**タイトル**  
`[P0] AI credits API入力検証強化: 負値・不正値の拒否`

**背景**  
`credits_consumed` が負値の場合に残高が増える経路があるため、即時修正が必要。

**対応内容**
- `credits_needed` / `credits_consumed` を厳密バリデーション
- 整数・正数・上限値チェックを追加
- 不正値は 400 を返しDB更新しない

**受け入れ条件**
- `credits_consumed <= 0` は必ず拒否
- 小数/NaN/文字列/過大値を拒否
- 正常値のみ消費処理に進む

**対象ファイル**
- `src/app/api/ai/credits/route.ts`
- `src/lib/api/validation.ts`（必要に応じて）

**見積**  
2-4h

**推奨ラベル**  
`security`, `ai`, `billing`, `priority:P0`

---

## Issue 05
**タイトル**  
`[P0] クレジット消費の原子化: 条件付き減算RPC導入`

**背景**  
read-modify-write 方式では同時実行で二重消費や過剰許可が起こりうる。

**対応内容**
- Supabase/Postgres 関数で `remaining >= cost` 条件付き更新を実装
- APIは関数結果のみで成功/失敗を判定
- 競合時のレスポンスを統一（残高不足等）

**受け入れ条件**
- 同時リクエストでも過剰許可が発生しない
- 残高不足時に減算は行われない
- 消費結果がログと一致する

**対象ファイル**
- `supabase/migrations/*`（新規migration含む）
- `src/app/api/ai/credits/route.ts`

**見積**  
4-6h

**推奨ラベル**  
`supabase`, `ai`, `billing`, `priority:P0`

---

## Issue 06
**タイトル**  
`[P0] 全AI APIのサーバー側課金ガード強制（reserve/refund）`

**背景**  
クライアント側の残高確認だけではAPI直叩きで回避可能。サーバー側で強制する必要がある。

**対応内容**
- 各AIエンドポイントで実行前にクレジット予約（reserve）
- AI処理失敗時は返金（refund）
- 課金対象外機能と対象機能の判定をサーバーで統一

**受け入れ条件**
- 残高不足ユーザーはAI実行不可
- API直叩きでも課金ルールを回避できない
- 失敗時はクレジットが戻る

**対象ファイル**
- `src/app/api/ai/*`
- `src/lib/ai/router.ts`
- `src/app/api/ai/credits/route.ts`

**見積**  
8-12h

**推奨ラベル**  
`ai`, `billing`, `backend`, `priority:P0`

---

## Issue 07
**タイトル**  
`[P1] Stripe Webhook冪等化: event.id重複処理の防止`

**背景**  
Stripeの再送で同一イベントが複数回処理される可能性があり、重複加算のリスクがある。

**対応内容**
- `event.id` を保存するテーブルを追加
- 処理前に重複判定し、既処理はスキップ
- 成功/失敗の記録を残し再試行戦略を明確化

**受け入れ条件**
- 同一 `event.id` の2回目以降で副作用なし
- One-time creditの二重加算が起きない
- 監査可能な処理ログが残る

**対象ファイル**
- `supabase/migrations/*`
- `src/app/api/stripe/webhook/route.ts`

**見積**  
6-10h

**推奨ラベル**  
`stripe`, `billing`, `backend`, `priority:P1`

---

## Issue 08
**タイトル**  
`[P1] Webhookエラーハンドリング改善: 失敗のサイレント化防止`

**背景**  
DB更新失敗時に成功レスポンス相当となる経路があると、課金反映漏れを見逃す。

**対応内容**
- 主要DB操作のエラーチェックを強制
- 失敗時はログ/メトリクス送信と明確なステータス返却
- 復旧手順用の診断ログ（event.id, customer, price）を統一出力

**受け入れ条件**
- 主要更新失敗時に必ず異常が検知される
- 反映漏れが運用で追跡可能
- 既存成功フローは維持

**対象ファイル**
- `src/app/api/stripe/webhook/route.ts`

**見積**  
4-6h

**推奨ラベル**  
`stripe`, `observability`, `backend`, `priority:P1`

---

## Issue 09
**タイトル**  
`[P1] 初回購入時のユーザー紐付け保証（client_reference_id等）`

**背景**  
`stripe_customer_id` 未登録の初回購入で、Webhook反映漏れが起こる可能性がある。

**対応内容**
- Checkout作成時にアプリ側ユーザー識別子を付与
- Webhookでユーザー特定のフォールバックを改善
- `stripe_customer_id` を初回で確実に保存

**受け入れ条件**
- 初回決済ユーザーに確実にtier/credits反映
- 0行更新のまま成功終了しない
- 後続決済で同一ユーザーに正しく紐付く

**対象ファイル**
- `src/app/api/stripe/checkout/route.ts`
- `src/app/api/stripe/webhook/route.ts`

**見積**  
4-6h

**推奨ラベル**  
`stripe`, `billing`, `backend`, `priority:P1`

---

## Issue 10
**タイトル**  
`[P1] Origin/CSRF判定の厳密化（includes廃止）`

**背景**  
`origin.includes(host)` のような比較は、細工ドメインを誤許可する可能性がある。

**対応内容**
- URL parse後の `scheme + host + port` 厳密一致に変更
- 許可originは固定リスト/環境変数で明示管理
- `x-forwarded-host` 依存箇所は信頼境界を明確化

**受け入れ条件**
- `victim.com.attacker.tld` などを拒否
- 正常originのみ通過
- Stripe return URL生成が安全に動作

**対象ファイル**
- `src/lib/api/origin.ts`
- `src/proxy.ts`
- `src/app/api/stripe/checkout/route.ts`
- `src/app/api/stripe/portal/route.ts`

**見積**  
4-6h

**推奨ラベル**  
`security`, `api`, `backend`, `priority:P1`

---

## Issue 11
**タイトル**  
`[P2] AI API入力制限の追加（prompt/base64/mime）`

**背景**  
入力サイズ・形式の制御不足は高コスト呼び出しやDoSの温床となる。

**対応内容**
- prompt長、画像データ長、mime/typeを各ルートで検証
- 共通バリデーションヘルパーを整備
- 制限値超過時のエラー仕様を統一

**受け入れ条件**
- 異常サイズ入力を受け付けない
- すべての課金AIルートで同等の制限が有効
- エラーレスポンス仕様が一貫している

**対象ファイル**
- `src/app/api/ai/*`
- `src/lib/api/validation.ts`

**見積**  
4-8h

**推奨ラベル**  
`security`, `ai`, `api`, `priority:P2`

---

## Issue 12
**タイトル**  
`[P2] 料金仕様整合: lifetime表示と実装の統一 + subscription.updated再付与見直し`

**背景**  
「無制限」表示と実装値がズレると、課金トラブルや信頼低下につながる。

**対応内容**
- lifetimeの仕様をプロダクト/法務/実装で統一
- `customer.subscription.updated` 時のクレジット付与条件を再設計
- UI文言・ドキュメント・APIレスポンスの整合を取る

**受け入れ条件**
- 表示仕様と実装仕様が一致
- 想定外イベントでクレジット再付与されない
- サブスクページとドキュメントに矛盾がない

**対象ファイル**
- `src/app/api/subscription/packages/route.ts`
- `src/app/api/stripe/webhook/route.ts`
- `docs/subscription-setup.md`

**見積**  
3-5h

**推奨ラベル**  
`billing`, `product`, `docs`, `priority:P2`

---

## マイルストーン案
- Milestone 1: `Production Blockers (P0)`  
- Milestone 2: `Billing Reliability (P1)`  
- Milestone 3: `Hardening & Consistency (P2)`

## 合計工数目安
- P0: 26-39h
- P1: 18-28h
- P2: 7-13h
- 合計: 51-80h（約7-10人日）
