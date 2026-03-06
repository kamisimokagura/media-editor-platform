# MediEdi! Design System v2 - Design Document

**Date**: 2026-03-06
**Status**: Approved

## Overview

MediEdi! のデザインを世界的デザインシステムに準拠して大刷新する。
「業務でAIが使えない人が手軽にローカルで使えるメディアエディタ」として、
**信頼感 + 親しみやすさ** を両立するデザインを実現する。

## Target Users

- プロ/セミプロ + カジュアルユーザーの両方
- 業務でAIが使えない環境の人が、手軽にローカルで使える
- 日本語ネイティブ（UI言語: 日本語）

## Design Direction

- **Notion / Linear** の洗練さ + **Canva** の親しみやすさ
- ミニマルだけど冷たくない、プロっぽいけど怖くない
- ライト/ダーク両方フルクオリティ

## Design Systems Referenced

| System | What We Take |
|--------|-------------|
| **IBM Carbon** | トークン構造（色・spacing・typography の体系化） |
| **Radix UI** | アクセシビリティパターン、ヘッドレスUI設計思想 |
| **Tailwind** | ユーティリティファーストCSS、既存資産活用 |
| **独自テーマ層** | 柔らかさ（角丸・パステル・Phosphor Icons） |

## Color System

### Light Mode

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#FAFAFA` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, modals, panels |
| `--color-border` | `#E5E7EB` | Borders, dividers |
| `--color-text` | `#1F2937` | Primary text |
| `--color-text-muted` | `#6B7280` | Secondary text, placeholders |
| `--color-accent` | `#6366F1` | Primary actions, links, focus |
| `--color-accent-hover` | `#4F46E5` | Accent hover state |
| `--color-success` | `#10B981` | Success states |
| `--color-warning` | `#F59E0B` | Warning states |
| `--color-error` | `#EF4444` | Error states, danger |

### Dark Mode

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#09090B` | Page background (zinc-950) |
| `--color-surface` | `#18181B` | Cards, modals (zinc-900) |
| `--color-border` | `#27272A` | Borders (zinc-800) |
| `--color-text` | `#FAFAFA` | Primary text |
| `--color-text-muted` | `#A1A1AA` | Secondary text |
| `--color-accent` | `#818CF8` | Accent (indigo-400) |
| `--color-accent-hover` | `#6366F1` | Accent hover |

## Typography Scale

| Level | Size | Weight | Font | Usage |
|-------|------|--------|------|-------|
| Display | 36px | 700 | Poppins | Hero sections |
| H1 | 30px | 600 | Poppins | Page titles |
| H2 | 24px | 600 | Poppins | Section titles |
| H3 | 20px | 600 | Poppins | Subsections |
| Body | 16px | 400 | Inter | Default text |
| Body SM | 14px | 400 | Inter | Editor UI, dense areas |
| Caption | 12px | 500 | Inter | Labels, metadata |

## Spacing Scale (4px base)

| Token | Value |
|-------|-------|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 12px |
| `base` | 16px |
| `lg` | 24px |
| `xl` | 32px |
| `2xl` | 48px |
| `3xl` | 64px |

## Icon System

**Library**: Phosphor Icons (`@phosphor-icons/react`)

| Context | Weight | Size |
|---------|--------|------|
| Navigation | light | 20px |
| Toolbar | regular | 20px |
| Buttons (with text) | regular | 20px |
| Hero/Empty states | thin | 48px |
| Toast/Status | fill | 20px |

## Design Tokens (CSS Custom Properties)

```css
:root {
  /* Colors - Light */
  --color-bg: #FAFAFA;
  --color-surface: #FFFFFF;
  --color-border: #E5E7EB;
  --color-text: #1F2937;
  --color-text-muted: #6B7280;
  --color-accent: #6366F1;
  --color-accent-hover: #4F46E5;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* Shadow */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-lg: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04);

  /* Transition */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #09090B;
    --color-surface: #18181B;
    --color-border: #27272A;
    --color-text: #FAFAFA;
    --color-text-muted: #A1A1AA;
    --color-accent: #818CF8;
    --color-accent-hover: #6366F1;
    --shadow-sm: none;
    --shadow-md: none;
    --shadow-lg: none;
  }
}
```

## Component Specifications

### Button

- **Variants**: Primary (accent fill) / Secondary (border) / Ghost (transparent) / Danger (red fill)
- **Sizes**: sm (32px) / md (40px) / lg (48px)
- **Radius**: `--radius-md`
- **Icon**: Left-aligned, Phosphor 20px
- **States**: hover (accent-hover) / active (scale 0.98) / disabled (opacity 0.5) / loading (Phosphor Spinner)

### Input / Select / Textarea

- **Height**: 40px (input/select), min-height 80px (textarea)
- **Border**: 1px `--color-border`, focus: ring-2 accent
- **Radius**: `--radius-md`
- **Label**: Above, Body SM (14px/500)
- **Error**: border-red + error message below (Caption/red)

### Card

- **Background**: `--color-surface`
- **Border**: 1px `--color-border`
- **Radius**: `--radius-lg` (12px)
- **Shadow**: `--shadow-sm` (light), border only (dark)
- **Padding**: 24px
- **Interactive hover**: `--shadow-md` + translateY(-1px)

### Header

- **Height**: 56px, sticky, backdrop-blur(8px)
- **Light**: surface bg + bottom border
- **Dark**: zinc-900 + bottom border
- **Logo**: Poppins 700 "MediEdi!" + Phosphor Sparkle
- **Nav**: Ghost button style, active = accent underline
- **Right**: Dark mode toggle + user avatar/login

### Sidebar

- **Width**: 280px (expanded) / 0px (collapsed)
- **Background**: surface + right border
- **Items**: Thumbnail (48px) + filename + metadata
- **Transition**: width 200ms ease

### Modal

- **Overlay**: black/50 + backdrop-blur(4px)
- **Container**: surface, radius-lg, shadow-lg
- **Sizes**: sm (400px) / md (520px) / lg (680px) / xl (800px)
- **Animation**: scale(0.95)->1 + opacity, 200ms
- **Close**: Top-right Phosphor X, Ghost button
- **Footer**: Right-aligned, Primary + Secondary buttons

### Toast

- **Position**: Bottom-right fixed
- **Style**: surface + left border 4px (color by type)
  - success: emerald / error: red / info: accent / warning: amber
- **Icon**: Phosphor (CheckCircle / XCircle / Info / Warning) fill weight
- **Animation**: Slide in from right, 300ms
- **Auto-dismiss**: 5s (configurable)

### DropZone

- **Border**: 2px dashed `--color-border`
- **Drag active**: border-accent + bg-accent/5
- **Icon**: Phosphor UploadSimple (48px, light weight)
- **Text**: "ファイルをドロップ または クリックして選択"
- **Radius**: `--radius-lg`
- **Height**: 200px

### Editor Toolbar

- **Background**: surface + border
- **Buttons**: Ghost style, icon-only (Phosphor regular)
- **Active**: bg-accent/10 + text-accent
- **Tooltip**: Bottom, Caption size, 500ms delay
- **Group divider**: 1px border (vertical)

### AI Chat Panel

- **Position**: Right side, width 360px
- **Header**: "AI アシスタント" + CreditBadge + close
- **User messages**: Right-aligned, accent/10 bg
- **AI messages**: Left-aligned, surface bg + border
- **Input**: Bottom-fixed, Textarea + Send button
- **Provider**: SegmentedControl (Gemini / Claude / Grok)

### SegmentedControl (New)

- **Background**: gray-100 (light) / zinc-800 (dark)
- **Active segment**: surface bg + shadow-sm + text-accent
- **Radius**: `--radius-md`
- **Transition**: 200ms ease

## Animation Policy

### Keep (Refine)

| Animation | Where | Duration |
|-----------|-------|----------|
| Gradient flow | Home hero | 8s loop |
| Float | Home decorative elements | 6s loop |
| Fade in | Page transitions | 200ms |
| Scale hover | Interactive cards | 200ms |
| Button press | All buttons | 100ms |
| Slide in | Toast, sidebar | 300ms |
| Modal scale | Modal open/close | 200ms |

### Remove

| Animation | Reason |
|-----------|--------|
| Neon border/text | Too flashy for business tool |
| Blob morph | Distracting in editor context |
| Particle effects | Performance overhead |
| Pulse glow | Unnecessary visual noise |
| 3D tilt | Gimmicky for professional tool |
| Shine sweep | Excessive decoration |
| Text reveal/split reveal | Over-engineered for content pages |
| Stagger animations (8 variants) | Consolidate to 1 simple stagger |

## Page-Specific Design

| Page | Tone | Notes |
|------|------|-------|
| Home | Welcoming | Gradient hero, clear CTA, feature cards |
| Editor (Image/Video) | Functional | Dense UI, dark mode optimized, toolbar-centric |
| Subscription | Trustworthy | Card comparison, clear pricing, accent on recommended |
| Tools | Simple | DropZone + settings + preview, minimal chrome |
| Contact | Warm | Clean form, friendly copy |
| Legal (terms/privacy/tokushoho) | Minimal | Text-centric, max-width prose |

## Responsive Strategy

| Breakpoint | Target |
|------------|--------|
| < 640px | Mobile: Single column, bottom nav, collapsed sidebar |
| 640-1024px | Tablet: Adjusted grid, collapsible panels |
| > 1024px | Desktop: Full layout with sidebar + panels |

## Accessibility

- WCAG 2.1 AA contrast ratios
- Focus ring on all interactive elements (2px accent)
- `prefers-reduced-motion: reduce` support
- Keyboard navigation for all components
- ARIA labels on icon-only buttons
- Screen reader announcements for toasts
