# Design System v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** MediEdi! のデザインを Carbon トークン構造 + Radix パターン + Phosphor Icons で大刷新し、信頼感と親しみやすさを両立する。

**Architecture:** デザイントークン（CSS Custom Properties）をベースに、全UIコンポーネントを段階的にリビルド。globals.css を大幅整理し、不要なアニメーションを削除。ライト/ダーク両モードをフルクオリティで実装。

**Tech Stack:** Tailwind CSS 4.1 / Phosphor Icons / CSS Custom Properties / Next.js 16 / React 19

**Design Doc:** `docs/plans/2026-03-06-design-system-v2-design.md`

---

## Task 1: Phosphor Icons インストール + デザイントークン定義

**Files:**
- Modify: `package.json` (dependency追加)
- Create: `src/styles/design-tokens.css`
- Modify: `src/styles/globals.css:1-5` (トークンインポート追加)

**Step 1: Phosphor Icons をインストール**

Run: `npm install @phosphor-icons/react`

**Step 2: デザイントークン CSS ファイルを作成**

Create `src/styles/design-tokens.css`:

```css
/* MediEdi! Design System v2 - Design Tokens */

:root {
  /* === Colors - Light === */
  --color-bg: #FAFAFA;
  --color-surface: #FFFFFF;
  --color-surface-raised: #FFFFFF;
  --color-border: #E5E7EB;
  --color-border-hover: #D1D5DB;
  --color-text: #1F2937;
  --color-text-muted: #6B7280;
  --color-text-inverse: #FFFFFF;

  --color-accent: #6366F1;
  --color-accent-hover: #4F46E5;
  --color-accent-soft: rgba(99, 102, 241, 0.1);
  --color-accent-text: #4F46E5;

  --color-success: #10B981;
  --color-success-soft: rgba(16, 185, 129, 0.1);
  --color-warning: #F59E0B;
  --color-warning-soft: rgba(245, 158, 11, 0.1);
  --color-error: #EF4444;
  --color-error-soft: rgba(239, 68, 68, 0.1);

  /* === Radius === */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* === Shadow === */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.04);

  /* === Spacing === */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-base: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;

  /* === Typography === */
  --font-display: var(--font-poppins), system-ui, sans-serif;
  --font-body: var(--font-inter), system-ui, sans-serif;

  --text-display: 700 36px/1.2 var(--font-display);
  --text-h1: 600 30px/1.3 var(--font-display);
  --text-h2: 600 24px/1.35 var(--font-display);
  --text-h3: 600 20px/1.4 var(--font-display);
  --text-body: 400 16px/1.6 var(--font-body);
  --text-body-sm: 400 14px/1.5 var(--font-body);
  --text-caption: 500 12px/1.4 var(--font-body);

  /* === Transition === */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
}

/* === Dark Mode === */
.dark {
  --color-bg: #09090B;
  --color-surface: #18181B;
  --color-surface-raised: #1F1F23;
  --color-border: #27272A;
  --color-border-hover: #3F3F46;
  --color-text: #FAFAFA;
  --color-text-muted: #A1A1AA;
  --color-text-inverse: #09090B;

  --color-accent: #818CF8;
  --color-accent-hover: #6366F1;
  --color-accent-soft: rgba(129, 140, 248, 0.1);
  --color-accent-text: #A5B4FC;

  --color-success: #34D399;
  --color-success-soft: rgba(52, 211, 153, 0.1);
  --color-warning: #FBBF24;
  --color-warning-soft: rgba(251, 191, 36, 0.1);
  --color-error: #F87171;
  --color-error-soft: rgba(248, 113, 113, 0.1);

  --shadow-sm: none;
  --shadow-md: none;
  --shadow-lg: none;
}

/* === Media query fallback === */
@media (prefers-color-scheme: dark) {
  :root:not(.light) {
    --color-bg: #09090B;
    --color-surface: #18181B;
    --color-surface-raised: #1F1F23;
    --color-border: #27272A;
    --color-border-hover: #3F3F46;
    --color-text: #FAFAFA;
    --color-text-muted: #A1A1AA;
    --color-text-inverse: #09090B;
    --color-accent: #818CF8;
    --color-accent-hover: #6366F1;
    --color-accent-soft: rgba(129, 140, 248, 0.1);
    --color-accent-text: #A5B4FC;
    --shadow-sm: none;
    --shadow-md: none;
    --shadow-lg: none;
  }
}
```

**Step 3: globals.css の先頭でトークンをインポート**

`src/styles/globals.css` の先頭（Tailwind import の直後）に追加:
```css
@import "./design-tokens.css";
```

**Step 4: ビルド確認**

Run: `npm run build`
Expected: 成功

**Step 5: コミット**

```bash
git add package.json package-lock.json src/styles/design-tokens.css src/styles/globals.css
git commit -m "feat(design): add Phosphor Icons + design tokens foundation"
```

---

## Task 2: UI コンポーネント — Button リビルド

**Files:**
- Modify: `src/components/ui/Button.tsx` (全書き換え)

**Step 1: Button.tsx をリビルド**

```tsx
"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { SpinnerGap } from "@phosphor-icons/react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-accent)] text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-hover)] focus-visible:ring-[var(--color-accent)]",
  secondary:
    "border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-accent-soft)] focus-visible:ring-[var(--color-accent)]",
  ghost:
    "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-accent-soft)] focus-visible:ring-[var(--color-accent)]",
  danger:
    "bg-[var(--color-error)] text-white hover:opacity-90 focus-visible:ring-[var(--color-error)]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      icon,
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center font-medium
          rounded-[var(--radius-md)] transition-all duration-[var(--transition-fast)]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none
          ${variantStyles[variant]} ${sizeStyles[size]} ${className}
        `}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <SpinnerGap size={size === "lg" ? 22 : 18} className="animate-spin" />
        ) : icon ? (
          icon
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };
export type { ButtonProps };
```

**Step 2: ビルド確認**

Run: `npm run lint && npm run build`
Expected: 成功

**Step 3: コミット**

```bash
git add src/components/ui/Button.tsx
git commit -m "feat(design): rebuild Button with design tokens + Phosphor Icons"
```

---

## Task 3: UI コンポーネント — Input, Card, SegmentedControl 新規作成

**Files:**
- Create: `src/components/ui/Input.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/SegmentedControl.tsx`
- Modify: `src/components/ui/index.ts` (エクスポート追加)

**Step 1: Input.tsx を作成**

```tsx
"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const inputBase = `
  w-full h-10 px-3 text-sm rounded-[var(--radius-md)]
  bg-[var(--color-surface)] text-[var(--color-text)]
  border border-[var(--color-border)]
  placeholder:text-[var(--color-text-muted)]
  hover:border-[var(--color-border-hover)]
  focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]
  disabled:opacity-50 disabled:cursor-not-allowed
  transition-colors duration-[var(--transition-fast)]
`;

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`${inputBase} ${error ? "border-[var(--color-error)] focus:ring-[var(--color-error)]" : ""} ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`${inputBase} min-h-[80px] h-auto py-2 ${error ? "border-[var(--color-error)] focus:ring-[var(--color-error)]" : ""} ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Input, Textarea };
```

**Step 2: Card.tsx を作成**

```tsx
import type { ReactNode, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
  padding?: "sm" | "md" | "lg";
}

const paddingStyles = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  children,
  interactive = false,
  padding = "md",
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`
        bg-[var(--color-surface)] border border-[var(--color-border)]
        rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)]
        ${paddingStyles[padding]}
        ${interactive ? "hover:shadow-[var(--shadow-md)] hover:-translate-y-px transition-all duration-[var(--transition-base)] cursor-pointer" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
```

**Step 3: SegmentedControl.tsx を作成**

```tsx
"use client";

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`
        inline-flex p-1 rounded-[var(--radius-md)]
        bg-[var(--color-border)] dark:bg-zinc-800
        ${className}
      `}
      role="tablist"
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={`
            px-4 py-1.5 text-sm font-medium rounded-[var(--radius-sm)]
            transition-all duration-[var(--transition-base)]
            ${
              value === option.value
                ? "bg-[var(--color-surface)] text-[var(--color-accent-text)] shadow-[var(--shadow-sm)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
```

**Step 4: index.ts にエクスポート追加**

```ts
export { Button } from './Button';
export { Slider } from './Slider';
export { DropZone } from './DropZone';
export { ToastContainer } from './Toast';
export { ProgressBar } from './ProgressBar';
export { Modal } from './Modal';
export { Input, Textarea } from './Input';
export { Card } from './Card';
export { SegmentedControl } from './SegmentedControl';
```

**Step 5: ビルド確認 + コミット**

```bash
npm run lint && npm run build
git add src/components/ui/
git commit -m "feat(design): add Input, Card, SegmentedControl components"
```

---

## Task 4: UI コンポーネント — Modal, Toast, DropZone リビルド

**Files:**
- Modify: `src/components/ui/Modal.tsx` (全書き換え)
- Modify: `src/components/ui/Toast.tsx` (全書き換え)
- Modify: `src/components/ui/DropZone.tsx` (全書き換え)

**Step 1: Modal.tsx をリビルド**

デザイントークンベースに変更:
- overlay: black/50 + backdrop-blur(4px)
- container: surface bg, radius-lg, shadow-lg
- animation: scale(0.95)->1 + opacity
- close: Phosphor X アイコン
- 既存 Props インターフェースは維持

**Step 2: Toast.tsx をリビルド**

デザイントークンベースに変更:
- surface bg + 左ボーダー 4px（色で種別）
- Phosphor アイコン（CheckCircle, XCircle, Info, Warning）fill weight
- slide-in from right アニメーション
- 既存の toastStore 連携は維持

**Step 3: DropZone.tsx をリビルド**

デザイントークンベースに変更:
- 2px dashed border
- Phosphor UploadSimple アイコン (48px, light weight)
- ドラッグ状態: accent border + accent-soft bg
- 既存のファイルハンドリングロジックは維持

**Step 4: ビルド確認 + コミット**

```bash
npm run lint && npm run build
git add src/components/ui/Modal.tsx src/components/ui/Toast.tsx src/components/ui/DropZone.tsx
git commit -m "feat(design): rebuild Modal, Toast, DropZone with design tokens"
```

---

## Task 5: UI コンポーネント — Slider, ProgressBar リビルド

**Files:**
- Modify: `src/components/ui/Slider.tsx`
- Modify: `src/components/ui/ProgressBar.tsx`

**Step 1: Slider.tsx をリビルド**

- accent カラーのトラック + thumb
- ラベルとエディタブル値を維持
- デザイントークンベースのスタイリング

**Step 2: ProgressBar.tsx をリビルド**

- accent カラーのバー
- border-radius 統一
- shimmer アニメーションは維持

**Step 3: ビルド確認 + コミット**

```bash
npm run lint && npm run build
git add src/components/ui/Slider.tsx src/components/ui/ProgressBar.tsx
git commit -m "feat(design): rebuild Slider, ProgressBar with design tokens"
```

---

## Task 6: Layout — Header リビルド

**Files:**
- Modify: `src/components/layout/Header.tsx` (全書き換え)

**Step 1: Header.tsx をリビルド**

変更点:
- 背景: surface + bottom border（グラデーション廃止）
- 高さ: 56px, sticky, backdrop-blur(8px)
- ロゴ: Poppins 700 "MediEdi!" + Phosphor Sparkle アイコン
- ナビ: Ghost Button スタイル、active = accent 下線
- ダークモード切替: Phosphor Sun/Moon アイコン
- ユーザーメニュー: Phosphor User/SignOut アイコン
- モバイルメニュー: Phosphor List/X アイコン
- 全インラインSVGを Phosphor に置換
- 既存の認証ロジック・ルーティングは維持

**Step 2: ビルド確認 + コミット**

```bash
npm run lint && npm run build
git add src/components/layout/Header.tsx
git commit -m "feat(design): rebuild Header with design tokens + Phosphor Icons"
```

---

## Task 7: Layout — Sidebar リビルド

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

**Step 1: Sidebar.tsx をリビルド**

変更点:
- 背景: surface + right border
- 幅: 280px / 0px (折りたたみ)
- Phosphor アイコン（FolderOpen, File, Image, Video）
- ファイル一覧のスタイリングをトークンベースに
- transition: width 200ms ease

**Step 2: ビルド確認 + コミット**

```bash
npm run lint && npm run build
git add src/components/layout/Sidebar.tsx
git commit -m "feat(design): rebuild Sidebar with design tokens + Phosphor Icons"
```

---

## Task 8: globals.css 大幅整理

**Files:**
- Modify: `src/styles/globals.css` (1338行 → ~300行目標)

**Step 1: 削除するセクション**

以下を全削除:
- Neon effects (neon-border, neon-text)
- Blob morph animation
- 3D card / tilt effects
- Pulse glow
- Shine / reflection effects
- Text reveal animations (text-reveal, char-reveal, split-text)
- Stagger animations (8 variants → 1 simple に統合)
- Magnetic button effect
- Image parallax
- 大量のグラスモルフィズムクラス（glass, glass-dark, glass-card）
- 旧カラー変数（primary-50~900, dark-50~950 等）

**Step 2: 残すセクション**

- Tailwind import + design-tokens import
- gradient-flow（ホームヒーロー用、簡素化）
- float animation（ホームヒーロー用、1つだけ）
- shimmer（ローディング用）
- spin（スピナー用）
- page transition（fadeIn のみ）
- 基本的な form input スタイル（input-modern は design tokens で置換）
- timeline スタイル（エディタ固有）
- compare slider（エディタ固有）
- reduced motion support
- print styles
- responsive utilities

**Step 3: リファクタ実施**

globals.css を整理して以下の構造に:
```css
@import "tailwindcss";
@import "./design-tokens.css";

/* === Base Reset === */
/* === Animations (minimal) === */
/* === Home Hero (gradient, float) === */
/* === Editor-specific (timeline, compare) === */
/* === Loading States (shimmer, spinner) === */
/* === Utilities (responsive, print, reduced-motion) === */
```

**Step 4: ビルド確認 + コミット**

```bash
npm run lint && npm run build
git add src/styles/globals.css
git commit -m "refactor(design): clean globals.css from 1338 to ~300 lines"
```

---

## Task 9: ページ — Home (page.tsx) リビルド

**Files:**
- Modify: `src/app/page.tsx` (766行)

**Step 1: ヒーローセクション刷新**

- 背景: シンプルなグラデーション（accent → accent-soft）
- ネオン/blob/パーティクル削除
- DropZone を Card コンポーネントで包む
- CTA ボタンを Button コンポーネントに置換
- Phosphor アイコンに全置換
- Trust indicators を Card で統一

**Step 2: Features / Tools / How it works セクション刷新**

- Feature cards → Card コンポーネント使用
- Tools grid → Card (interactive) 使用
- How it works → シンプルなステップ表示
- 全インラインSVGを Phosphor に置換

**Step 3: Footer 刷新**

- surface bg + top border
- リンクを text-muted + hover:text で統一
- Phosphor アイコンに置換

**Step 4: ビルド確認 + コミット**

```bash
npm run lint && npm run build
git add src/app/page.tsx
git commit -m "feat(design): rebuild Home page with Design System v2"
```

---

## Task 10: ページ — Subscription リビルド

**Files:**
- Modify: `src/app/subscription/page.tsx` (639行)

**Step 1: リビルド**

- Billing タブ → SegmentedControl コンポーネント使用
- Plan cards → Card コンポーネント使用
- ボタン → Button コンポーネント使用
- 「おすすめ」badge: accent-soft bg + accent-text
- 価格表示: Display フォント
- Feature list: Phosphor Check アイコン
- Package cards → Card (interactive) 使用
- glass-card クラス削除、トークンベースに

**Step 2: ビルド確認 + コミット**

```bash
npm run lint && npm run build
git add src/app/subscription/page.tsx
git commit -m "feat(design): rebuild Subscription page with Design System v2"
```

---

## Task 11: ページ — Contact, Legal ページ リビルド

**Files:**
- Modify: `src/app/contact/page.tsx` (142行)
- Modify: `src/app/privacy/page.tsx`
- Modify: `src/app/terms/page.tsx`
- Modify: `src/app/tokushoho/page.tsx`

**Step 1: Contact ページ**

- glass-card → Card コンポーネント
- input → Input コンポーネント
- textarea → Textarea コンポーネント
- button → Button コンポーネント
- Phosphor Envelope, Clock, ChatCircle アイコン

**Step 2: Legal ページ（privacy, terms, tokushoho）**

- max-w-prose レイアウト
- typography トークンベース
- 余分な装飾削除

**Step 3: ビルド確認 + コミット**

```bash
npm run lint && npm run build
git add src/app/contact/ src/app/privacy/ src/app/terms/ src/app/tokushoho/
git commit -m "feat(design): rebuild Contact + Legal pages with Design System v2"
```

---

## Task 12: ページ — Editor (Image/Video), Tools リビルド

**Files:**
- Modify: `src/app/editor/page.tsx`
- Modify: `src/app/image/page.tsx`
- Modify: `src/app/tools/[tool]/page.tsx`
- Modify: `src/app/convert/page.tsx`

**Step 1: Image Editor ページ**

- ツールバー: surface bg + border、Ghost ボタン
- タブ: SegmentedControl 使用
- パネル: Card コンポーネント
- アイコン: 全 Phosphor に置換

**Step 2: Video Editor ページ**

- 同様にトークンベースに刷新
- タイムラインのスタイルはエディタ固有として維持

**Step 3: Tools ページ（compress, resize, crop, filter, rotate）**

- DropZone + 設定パネル + プレビュー構成
- Card, Button, Input, Slider コンポーネント使用

**Step 4: Convert ページ**

- 同様にコンポーネント化

**Step 5: ビルド確認 + コミット**

```bash
npm run lint && npm run build
git add src/app/editor/ src/app/image/ src/app/tools/ src/app/convert/
git commit -m "feat(design): rebuild Editor + Tools pages with Design System v2"
```

---

## Task 13: AI コンポーネント刷新

**Files:**
- Modify: `src/components/ai/AIChatPanel.tsx`
- Modify: `src/components/ai/AIToolbar.tsx`
- Modify: `src/components/ai/CreditBadge.tsx`
- Modify: `src/components/ai/ModelSelector.tsx`
- Modify: `src/components/ai/AIGenerateModal.tsx`
- Modify: `src/components/ai/AIVideoModal.tsx`
- Modify: `src/components/ai/ContextTaskbar.tsx`

**Step 1: AIChatPanel**

- 幅 360px、surface bg + left border
- User msg: accent-soft bg, 右寄せ
- AI msg: surface-raised bg + border, 左寄せ
- Provider 切替: SegmentedControl
- Send ボタン: Button (primary)
- Phosphor アイコン（PaperPlaneRight, Robot, User）

**Step 2: AIToolbar**

- Ghost ボタンスタイル統一
- Phosphor アイコン置換
- active 状態: accent-soft bg

**Step 3: CreditBadge**

- Phosphor Coins アイコン
- text-caption サイズ
- accent-soft bg + radius-full

**Step 4: ModelSelector**

- SegmentedControl で置換

**Step 5: モーダル系（Generate, Video）**

- Modal コンポーネントベース
- Input, Button 使用
- Phosphor アイコン

**Step 6: ContextTaskbar**

- surface bg + top border
- Phosphor アイコン

**Step 7: ビルド確認 + コミット**

```bash
npm run lint && npm run build
git add src/components/ai/
git commit -m "feat(design): rebuild AI components with Design System v2"
```

---

## Task 14: Auth ページ + ExportModal 刷新

**Files:**
- Modify: `src/app/auth/signin/page.tsx`
- Modify: `src/app/auth/error/page.tsx`
- Modify: `src/components/editor/ExportModal.tsx`

**Step 1: Signin ページ**

- Card コンポーネント中央配置
- Button コンポーネント使用
- Phosphor アイコン（GoogleLogo, GithubLogo 等）

**Step 2: Error ページ**

- error-soft bg + error text
- Button でリトライ/戻る

**Step 3: ExportModal**

- Modal + Input + Button + SegmentedControl
- 品質スライダー: Slider コンポーネント
- フォーマット選択: SegmentedControl

**Step 4: ビルド確認 + コミット**

```bash
npm run lint && npm run build
git add src/app/auth/ src/components/editor/ExportModal.tsx
git commit -m "feat(design): rebuild Auth pages + ExportModal with Design System v2"
```

---

## Task 15: 最終確認 + ダークモード検証 + クリーンアップ

**Files:**
- 全体検証

**Step 1: 全ページのライトモード目視確認**

Run: `npm run dev`
全ページを巡回して表示崩れがないか確認

**Step 2: 全ページのダークモード目視確認**

ダークモードに切り替えて全ページ確認

**Step 3: 未使用インポート・変数のクリーンアップ**

Run: `npm run lint`
warning を確認して不要なものを削除

**Step 4: 最終ビルド確認**

Run: `npm run build`
Expected: 成功、エラーなし

**Step 5: 最終コミット + push**

```bash
git add -A
git commit -m "feat(design): complete Design System v2 overhaul

- Carbon token structure for colors, spacing, typography, radius, shadow
- Phosphor Icons throughout (navigation, toolbar, status, actions)
- Rebuilt all UI components (Button, Input, Card, Modal, Toast, etc.)
- New components: SegmentedControl, Input/Textarea, Card
- Cleaned globals.css from 1338 to ~300 lines
- Full light/dark mode parity
- Removed: neon, blob, tilt, pulse-glow, shine effects
- Kept: gradient hero, float, shimmer, page transitions"
git push origin main
```

---

## Task Dependencies

```
Task 1 (Tokens + Phosphor) ─┬─→ Task 2 (Button)
                             ├─→ Task 3 (Input, Card, Segmented)
                             ├─→ Task 4 (Modal, Toast, DropZone)
                             └─→ Task 5 (Slider, ProgressBar)
                                    │
Tasks 2-5 ──────────────────────────┼─→ Task 6 (Header)
                                    ├─→ Task 7 (Sidebar)
                                    └─→ Task 8 (globals.css cleanup)
                                           │
Tasks 6-8 ─────────────────────────────────┼─→ Task 9 (Home)
                                           ├─→ Task 10 (Subscription)
                                           ├─→ Task 11 (Contact + Legal)
                                           ├─→ Task 12 (Editor + Tools)
                                           ├─→ Task 13 (AI components)
                                           └─→ Task 14 (Auth + Export)
                                                  │
Tasks 9-14 ────────────────────────────────────────→ Task 15 (Final check)
```

## Parallelization Opportunities

- Tasks 2-5 can run in parallel (independent components)
- Tasks 9-14 can run in parallel (independent pages)
- Task 8 (globals.css) should run AFTER components are rebuilt to avoid breaking intermediate builds
