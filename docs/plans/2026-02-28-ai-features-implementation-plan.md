# AI Features Mega Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 27 AI features (5 free browser-based + 22 paid cloud API) with conversational AI assistant, non-destructive layer system, and context-aware UI to MediaEditor Platform.

**Architecture:** 2-layer AI — free tier runs entirely in browser (Canvas API + ONNX Runtime WASM), paid tier calls cloud APIs (fal.ai hub, Remove.bg, Gemini, OpenAI, xAI, Stability AI, Replicate, Deep-Image.ai). Credits consumed only on success.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Zustand 5, ONNX Runtime Web, TailwindCSS 4, Supabase (PostgreSQL + Auth), Stripe

---

## Phase Overview

| Phase | Name | Tasks | Description |
|-------|------|-------|-------------|
| 1 | Foundation | 1-3 | AI store, credit hook, AI feature router, env vars |
| 2 | Free: Canvas AI | 4-5 | Auto-enhance (Canvas API histogram analysis) |
| 3 | Free: ONNX Engine | 6-9 | ONNX model manager, upscale, denoise, face-detect, smart-crop |
| 4 | AI UI Shell | 10-14 | AIToolbar, ContextTaskbar, CreditBadge, AIResultLayer, ToolChain |
| 5 | Paid: Image Editing APIs | 15-20 | bg-remove, upscale-hd, inpaint, erase, expand, style |
| 6 | Paid: Image Generation | 21-23 | Multi-model image generation (6 models), modal UI |
| 7 | Paid: Video Generation | 24-26 | Multi-model video generation (7 models), modal UI |
| 8 | AI Chat Assistant | 27-30 | Streaming chat, 3 LLMs, action buttons, context-aware |
| 9 | Integration | 31-33 | Wire AI into ImageEditor, mobile layout, dark frost theme |
| 10 | Polish | 34-36 | Error handling, env.example update, build verify, deploy |

---

## Phase 1: Foundation

### Task 1: AI Store + Types

**Files:**
- Create: `src/stores/aiStore.ts`
- Create: `src/types/ai.ts`

**Step 1: Create AI types**

```typescript
// src/types/ai.ts
export type AILayerType =
  | "auto-enhance" | "upscale" | "denoise" | "face-detect" | "smart-crop"
  | "bg-remove" | "upscale-hd" | "inpaint" | "erase" | "expand" | "style"
  | "generate" | "video";

export interface AILayer {
  id: string;
  type: AILayerType;
  label: string;
  imageData: ImageData | null;
  imageUrl: string | null;
  visible: boolean;
  createdAt: number;
  model?: string;
  credits?: number;
}

export interface AIModelOption {
  id: string;
  name: string;
  provider: string;
  credits: number;
  tags: string[];        // e.g. ["fast", "hd", "photorealism"]
  description: string;
}

export interface AIChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AIChatAction[];
  timestamp: number;
}

export interface AIChatAction {
  label: string;
  type: "adjust" | "filter" | "ai_tool";
  params: Record<string, unknown>;
  credits: number;       // 0 = free
}

export type LLMProvider = "gemini" | "claude" | "grok";

export interface OnnxModelInfo {
  name: string;
  url: string;
  sizeBytes: number;
  version: string;
}

export type AIProcessingStatus = "idle" | "loading-model" | "processing" | "complete" | "error";
```

**Step 2: Create AI store**

```typescript
// src/stores/aiStore.ts
import { create } from "zustand";
import type { AILayer, AIChatMessage, LLMProvider, AIProcessingStatus } from "@/types/ai";

interface AIState {
  // Layers
  layers: AILayer[];
  addLayer: (layer: AILayer) => void;
  removeLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  clearLayers: () => void;

  // Chat
  chatMessages: AIChatMessage[];
  chatOpen: boolean;
  llmProvider: LLMProvider;
  addChatMessage: (message: AIChatMessage) => void;
  setChatOpen: (open: boolean) => void;
  setLLMProvider: (provider: LLMProvider) => void;
  clearChat: () => void;

  // Processing
  aiStatus: AIProcessingStatus;
  aiProgress: string;
  setAIStatus: (status: AIProcessingStatus, progress?: string) => void;

  // ONNX models loaded state
  loadedModels: Set<string>;
  markModelLoaded: (name: string) => void;

  // Credits (client-side cache)
  creditsRemaining: number;
  setCreditsRemaining: (credits: number) => void;
}

export const useAIStore = create<AIState>((set) => ({
  layers: [],
  addLayer: (layer) => set((s) => ({ layers: [...s.layers, layer] })),
  removeLayer: (id) => set((s) => ({ layers: s.layers.filter((l) => l.id !== id) })),
  toggleLayerVisibility: (id) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    })),
  clearLayers: () => set({ layers: [] }),

  chatMessages: [],
  chatOpen: false,
  llmProvider: "gemini",
  addChatMessage: (message) => set((s) => ({ chatMessages: [...s.chatMessages, message] })),
  setChatOpen: (open) => set({ chatOpen: open }),
  setLLMProvider: (provider) => set({ llmProvider: provider }),
  clearChat: () => set({ chatMessages: [] }),

  aiStatus: "idle",
  aiProgress: "",
  setAIStatus: (status, progress) => set({ aiStatus: status, aiProgress: progress ?? "" }),

  loadedModels: new Set(),
  markModelLoaded: (name) =>
    set((s) => {
      const next = new Set(s.loadedModels);
      next.add(name);
      return { loadedModels: next };
    }),

  creditsRemaining: 0,
  setCreditsRemaining: (credits) => set({ creditsRemaining: credits }),
}));
```

**Step 3: Export from types index**

Modify: `src/types/index.ts` — add `export * from "./ai";`

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/stores/aiStore.ts src/types/ai.ts src/types/index.ts
git commit -m "feat: add AI store and types foundation"
```

---

### Task 2: Credit Hook + AI Feature Router

**Files:**
- Create: `src/hooks/useCredits.ts`
- Create: `src/hooks/useAIFeature.ts`
- Create: `src/lib/ai/router.ts`

**Step 1: Create credit hook**

```typescript
// src/hooks/useCredits.ts
import { useCallback } from "react";
import { useAIStore } from "@/stores/aiStore";

export function useCredits() {
  const { creditsRemaining, setCreditsRemaining } = useAIStore();

  const checkCredits = useCallback(async (needed: number): Promise<boolean> => {
    if (needed <= 0) return true;
    // Optimistic client check
    if (creditsRemaining < needed) return false;
    // Server-side verify
    const res = await fetch("/api/ai/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check", operation: "credit_check", credits_needed: needed }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setCreditsRemaining(data.credits_remaining);
    return data.allowed;
  }, [creditsRemaining, setCreditsRemaining]);

  const consumeCredits = useCallback(async (amount: number, operation: string): Promise<boolean> => {
    if (amount <= 0) return true;
    const res = await fetch("/api/ai/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "consume", operation, credits_consumed: amount }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setCreditsRemaining(data.credits_remaining);
    return data.success;
  }, [setCreditsRemaining]);

  const refreshCredits = useCallback(async () => {
    const res = await fetch("/api/ai/usage");
    if (res.ok) {
      const data = await res.json();
      setCreditsRemaining(data.credits_remaining ?? 0);
    }
  }, [setCreditsRemaining]);

  return { creditsRemaining, checkCredits, consumeCredits, refreshCredits };
}
```

**Step 2: Create AI feature router**

```typescript
// src/lib/ai/router.ts
import type { AILayerType } from "@/types/ai";

interface AIFeatureConfig {
  type: AILayerType;
  credits: number;
  tier: "free" | "paid";
  provider: "canvas" | "onnx" | "api";
}

const FEATURE_CONFIG: Record<string, AIFeatureConfig> = {
  "auto-enhance":  { type: "auto-enhance",  credits: 0,  tier: "free", provider: "canvas" },
  "upscale-lite":  { type: "upscale",       credits: 0,  tier: "free", provider: "onnx" },
  "denoise":       { type: "denoise",       credits: 0,  tier: "free", provider: "onnx" },
  "face-detect":   { type: "face-detect",   credits: 0,  tier: "free", provider: "onnx" },
  "smart-crop":    { type: "smart-crop",    credits: 0,  tier: "free", provider: "onnx" },
  "bg-remove":     { type: "bg-remove",     credits: 2,  tier: "paid", provider: "api" },
  "upscale-hd":    { type: "upscale-hd",    credits: 3,  tier: "paid", provider: "api" },
  "inpaint":       { type: "inpaint",       credits: 5,  tier: "paid", provider: "api" },
  "erase":         { type: "erase",         credits: 3,  tier: "paid", provider: "api" },
  "expand":        { type: "expand",        credits: 4,  tier: "paid", provider: "api" },
  "style":         { type: "style",         credits: 3,  tier: "paid", provider: "api" },
};

export function getFeatureConfig(featureId: string): AIFeatureConfig | null {
  return FEATURE_CONFIG[featureId] ?? null;
}

export function isFreeFeature(featureId: string): boolean {
  return FEATURE_CONFIG[featureId]?.tier === "free";
}

export function getCreditsNeeded(featureId: string): number {
  return FEATURE_CONFIG[featureId]?.credits ?? 0;
}

export { FEATURE_CONFIG };
```

**Step 3: Create useAIFeature hook**

```typescript
// src/hooks/useAIFeature.ts
import { useCallback } from "react";
import { useAIStore } from "@/stores/aiStore";
import { useCredits } from "./useCredits";
import { getFeatureConfig, isFreeFeature } from "@/lib/ai/router";
import { toast } from "@/stores/toastStore";
import { v4 as uuidv4 } from "uuid";
import type { AILayer } from "@/types/ai";

export function useAIFeature() {
  const { addLayer, setAIStatus } = useAIStore();
  const { checkCredits, consumeCredits } = useCredits();

  const executeFeature = useCallback(
    async (
      featureId: string,
      processFn: () => Promise<{ imageData?: ImageData; imageUrl?: string } | null>,
      options?: { model?: string }
    ) => {
      const config = getFeatureConfig(featureId);
      if (!config) {
        toast.error("不明なAI機能です");
        return null;
      }

      // Credit check for paid features
      if (!isFreeFeature(featureId)) {
        const hasCredits = await checkCredits(config.credits);
        if (!hasCredits) {
          toast.error(`クレジットが不足しています (必要: ${config.credits}cr)`);
          return null;
        }
      }

      setAIStatus("processing", `${featureId} を処理中...`);

      try {
        const result = await processFn();
        if (!result) {
          setAIStatus("error", "処理に失敗しました");
          return null;
        }

        // Consume credits on success
        if (!isFreeFeature(featureId)) {
          await consumeCredits(config.credits, featureId);
        }

        const layer: AILayer = {
          id: uuidv4(),
          type: config.type,
          label: featureId,
          imageData: result.imageData ?? null,
          imageUrl: result.imageUrl ?? null,
          visible: true,
          createdAt: Date.now(),
          model: options?.model,
          credits: config.credits,
        };

        addLayer(layer);
        setAIStatus("complete", "完了！");
        toast.success(`${featureId} が完了しました`);
        return layer;
      } catch (err) {
        setAIStatus("error", "エラーが発生しました");
        toast.error(err instanceof Error ? err.message : "AI処理に失敗しました");
        return null;
      }
    },
    [addLayer, setAIStatus, checkCredits, consumeCredits]
  );

  return { executeFeature };
}
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add src/hooks/useCredits.ts src/hooks/useAIFeature.ts src/lib/ai/router.ts
git commit -m "feat: add credit hook, AI feature router, and useAIFeature hook"
```

---

### Task 3: Environment Variables Setup

**Files:**
- Modify: `src/lib/featureFlags.ts`
- Modify: `.env.example`
- Modify: `.env.local`

**Step 1: Update .env.example with all new API keys**

Add these below the existing AI API section:

```env
# fal.ai (hub for video/image models - Seedance, Kling, Veo, FLUX, etc.)
FAL_KEY=

# Stability AI (Inpaint, Erase)
STABILITY_API_KEY=

# Gemini (Nano Banana image gen + free assistant)
GOOGLE_GENERATIVE_AI_API_KEY=

# xAI Grok (Aurora image, Imagine video, 4.1 chat)
XAI_API_KEY=

# Deep-Image.ai (Outpainting)
DEEP_IMAGE_API_KEY=
```

Note: `OPENAI_API_KEY`, `REPLICATE_API_TOKEN`, `REMOVEBG_API_KEY` already exist in .env.example.

**Step 2: Commit**

```bash
git add .env.example
git commit -m "feat: add AI API environment variables to .env.example"
```

---

## Phase 2: Free Canvas AI

### Task 4: Auto-Enhance (Canvas API)

**Files:**
- Create: `src/lib/ai/browser/auto-enhance.ts`

**Step 1: Implement auto-enhance**

Analyze image histogram from Canvas ImageData. Compute optimal adjustments for brightness, contrast, saturation, color temperature. Return adjustment values that can be applied to the existing editor store's `imageAdjustments`.

Key algorithm:
1. Get ImageData from canvas
2. Compute luminance histogram (R*0.299 + G*0.587 + B*0.114)
3. Find 5th/95th percentile for contrast stretch
4. Compute average color temperature (warm/cool bias)
5. Return `Partial<ImageAdjustments>` to apply

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/lib/ai/browser/auto-enhance.ts
git commit -m "feat: add Canvas-based auto-enhance (histogram analysis)"
```

---

### Task 5: Lightweight Background Removal (Canvas)

**Files:**
- Create: `src/lib/ai/browser/bg-remove-lite.ts`

Canvas-based simple background removal using color-distance thresholding from edge pixels. Not AI-powered but instant and free. Good enough for solid/simple backgrounds.

**Commit after implementation.**

---

## Phase 3: ONNX Engine

### Task 6: ONNX Model Manager

**Files:**
- Create: `src/lib/ai/models/model-manager.ts`
- Run: `npm install onnxruntime-web`

Handles: CDN fetch → IndexedDB cache → ONNX InferenceSession creation.
Shows progress during download. Version-checks cached models.

**Commit after implementation.**

---

### Task 7: ONNX Upscale (Real-ESRGAN lite)

**Files:**
- Create: `src/lib/ai/browser/upscale.ts`
- Create: `src/hooks/useOnnxModel.ts`

Load Real-ESRGAN lite ONNX model (~15MB). Input: ImageData → Tensor → Inference → Output ImageData (2x resolution).

**Commit after implementation.**

---

### Task 8: ONNX Denoise

**Files:**
- Create: `src/lib/ai/browser/denoise.ts`

Similar pattern to upscale. Load denoising model, run inference, return cleaned ImageData.

**Commit after implementation.**

---

### Task 9: ONNX Face Detection + Smart Crop

**Files:**
- Create: `src/lib/ai/browser/face-detect.ts`
- Create: `src/lib/ai/browser/smart-crop.ts`

Face detection returns bounding boxes. Smart crop uses saliency model to find subject area and suggest optimal crop rectangle.

**Commit after implementation.**

---

## Phase 4: AI UI Shell

### Task 10: AI Toolbar Component

**Files:**
- Create: `src/components/ai/AIToolbar.tsx`

Sidebar section below existing tabs. Two groups: free (green accent) and paid (orange accent). Each button shows credit cost. Clicking triggers the corresponding AI feature via `useAIFeature`.

**Commit after implementation.**

---

### Task 11: Context Taskbar

**Files:**
- Create: `src/components/ai/ContextTaskbar.tsx`

Floating bar below canvas. Context-aware:
- Image loaded → [Auto-enhance] [BG Remove] [Upscale] [Style]
- Brush selection active → [Generative Fill] [Erase] [Style] + prompt input + reference upload
- Face detected → [Face Enhance] [Mosaic] [Beauty]

Uses frosted glass styling (`bg-frost` + `backdrop-blur-xl`).

**Commit after implementation.**

---

### Task 12: Credit Badge

**Files:**
- Create: `src/components/ai/CreditBadge.tsx`

Header component showing remaining credits. Dropdown with plan info + [Top Up] + [Manage] links. Uses `useCredits` hook.

**Commit after implementation.**

---

### Task 13: AI Result Layer + Before/After

**Files:**
- Create: `src/components/ai/AIResultLayer.tsx`
- Create: `src/hooks/useAILayers.ts`

Non-destructive overlay on canvas. Extends existing CompareView for before/after slider. Layer panel with visibility toggles. [Apply] [Undo] [Try another model] buttons.

**Commit after implementation.**

---

### Task 14: Tool Chain (Next Steps)

**Files:**
- Create: `src/components/ai/ToolChain.tsx`

Post-action suggestion component (Clipdrop pattern). Shows after any AI operation completes:
- After bg-remove → [Generate new BG] [Upscale] [Save PNG]
- After upscale → [Denoise] [Auto-enhance] [Export]
- After generate → [Edit in editor] [Upscale] [Style transfer]

**Commit after implementation.**

---

## Phase 5: Paid Image Editing APIs

### Task 15: API Provider Clients

**Files:**
- Create: `src/lib/ai/providers/removebg.ts`
- Create: `src/lib/ai/providers/replicate.ts`
- Create: `src/lib/ai/providers/stability.ts`
- Create: `src/lib/ai/providers/deep-image.ts`

Each provider client: accepts image (base64/URL), calls external API, returns result image. All server-side only (API keys not exposed).

**Commit after implementation.**

---

### Task 16: Background Removal API Route

**Files:**
- Create: `src/app/api/ai/remove-bg/route.ts`

POST: Accepts base64 image → calls Remove.bg API → returns PNG with transparency. Auth required. Credit check/consume handled by route.

**Commit after implementation.**

---

### Task 17: HD Upscale API Route

**Files:**
- Create: `src/app/api/ai/upscale/route.ts`

POST: Accepts base64 image + scale (4x/8x) → calls Replicate Real-ESRGAN → returns upscaled image. Polling for Replicate async results.

**Commit after implementation.**

---

### Task 18: Generative Fill (Inpaint) API Route

**Files:**
- Create: `src/app/api/ai/inpaint/route.ts`

POST: Accepts base64 image + mask + prompt + optional reference image → calls Stability AI Inpaint → returns result. Photoshop-style generative fill.

**Commit after implementation.**

---

### Task 19: Object Erase API Route

**Files:**
- Create: `src/app/api/ai/erase/route.ts`

POST: Accepts base64 image + mask → calls Stability AI Erase → returns image with object removed.

**Commit after implementation.**

---

### Task 20: Image Expand + Style Transfer API Routes

**Files:**
- Create: `src/app/api/ai/expand/route.ts`
- Create: `src/app/api/ai/style/route.ts`

Expand: Deep-Image.ai outpaint API. Style: Replicate style transfer model.

**Commit after implementation.**

---

## Phase 6: Paid Image Generation

### Task 21: Image Generation Provider Clients

**Files:**
- Create: `src/lib/ai/providers/gemini-image.ts`
- Create: `src/lib/ai/providers/openai-image.ts`
- Create: `src/lib/ai/providers/xai.ts`
- Create: `src/lib/ai/providers/fal.ts`

Each client wraps the respective API for image generation:
- Gemini: Nano Banana 2 / Pro
- OpenAI: GPT Image 1.5
- xAI: Grok Aurora
- fal.ai: FLUX.2, Recraft V4

**Commit after implementation.**

---

### Task 22: Image Generation API Route

**Files:**
- Create: `src/app/api/ai/generate/route.ts`

POST: Accepts prompt + model + size + reference_image? → routes to correct provider → returns generated image(s). Model-specific credit costs. Supports multiple result images.

**Commit after implementation.**

---

### Task 23: Image Generation Modal UI

**Files:**
- Create: `src/components/ai/AIGenerateModal.tsx`
- Create: `src/components/ai/ModelSelector.tsx`

Modal with: prompt input, reference image upload, model selection cards (6 models with pricing/tags), aspect ratio presets, result gallery, history. [Edit in editor] [Download] [Variations] [Regenerate].

**Commit after implementation.**

---

## Phase 7: Paid Video Generation

### Task 24: Video Generation Provider Clients

**Files:**
- Extend: `src/lib/ai/providers/fal.ts` (add Seedance 2.0, Kling 3.0, Veo 3.1, Wan 2.6, Pika 2.5)
- Extend: `src/lib/ai/providers/openai-image.ts` (add Sora 2)
- Extend: `src/lib/ai/providers/xai.ts` (add Grok Imagine 1.0)

Video generation is async (polling). Reserve credits on start, refund on failure.

**Commit after implementation.**

---

### Task 25: Video Generation API Route

**Files:**
- Create: `src/app/api/ai/video/route.ts`

POST: Accepts prompt + model + input_image? + input_video? + duration + resolution + audio → routes to provider → polling for result → returns video URL. Credit reservation + refund on failure.

**Commit after implementation.**

---

### Task 26: Video Generation Modal UI

**Files:**
- Create: `src/components/ai/AIVideoModal.tsx`

Modal with: input type selector (text/image/video), prompt, reference upload, model selection (7 models), duration slider, resolution selector, audio toggle, video preview player, download buttons.

**Commit after implementation.**

---

## Phase 8: AI Chat Assistant

### Task 27: Chat API Route (Streaming)

**Files:**
- Create: `src/app/api/ai/chat/route.ts`

POST: Accepts messages + llm_provider + image_context → routes to Gemini/Claude/Grok → returns streaming response. System prompt instructs LLM to return action JSON alongside text. Gemini = free, Claude = 2cr, Grok = 1cr.

**Commit after implementation.**

---

### Task 28: Chat Streaming Hook

**Files:**
- Create: `src/hooks/useAIChat.ts`

Hook for streaming chat with the API. Handles: message history, streaming text display, action JSON parsing from response, auto-attaches current image context (adjustments, filters, size, detected features).

**Commit after implementation.**

---

### Task 29: Chat Panel UI

**Files:**
- Create: `src/components/ai/AIChatPanel.tsx`

Right-side panel with frosted glass. LLM selector tabs (Gemini free / Claude 2cr / Grok 1cr). Message list with streaming. Action buttons inline (click to apply). Image analysis results display. Input box with send button.

**Commit after implementation.**

---

### Task 30: Chat Action Executor

**Files:**
- Create: `src/lib/ai/chat-actions.ts`

Parses AI assistant action JSON and executes:
- `adjust:{param}:{value}` → editorStore.setImageAdjustments
- `filter:{name}` → apply filter from constants/filters.ts
- `ai_tool:{name}` → trigger AI feature via useAIFeature

**Commit after implementation.**

---

## Phase 9: Integration

### Task 31: Wire AI into ImageEditor

**Files:**
- Modify: `src/components/editor/ImageEditor.tsx`
- Modify: `src/components/editor/panels/TabContent.tsx`
- Create: `src/components/ai/CreditGate.tsx`

Add "AI" tab to sidebar TabContent. Insert ContextTaskbar below canvas. Add AIResultLayer overlay. Add CreditBadge to Header. Add toggle button for AIChatPanel. CreditGate wraps paid features with credit check UI.

**Commit after implementation.**

---

### Task 32: Mobile Layout

**Files:**
- Modify AI components for responsive design

Mobile: AI tools in bottom sheet (swipeable). Context bar as horizontal scroll. Chat as fullscreen modal. Bottom tab navigation: [Adjust] [Crop] [AI] [Chat].

**Commit after implementation.**

---

### Task 33: Dark Frost Theme

**Files:**
- Modify: `src/app/globals.css` or Tailwind config

Add CSS custom properties for AI theme:
```css
--bg-base: #0A0A0F;
--bg-surface: #12121A;
--bg-frost: rgba(255,255,255,0.05);
--accent-ai: #8B5CF6;
--accent-free: #10B981;
--accent-paid: #F59E0B;
```

Apply to all AI components. Ensure existing editor components are unaffected.

**Commit after implementation.**

---

## Phase 10: Polish

### Task 34: Error Handling + Rate Limiting

**Files:**
- Create: `src/lib/ai/error-handler.ts`

Centralized error handling for all AI features:
- Credit insufficient → modal with [Top Up] [Change Plan]
- ONNX load fail → toast with [Retry]
- API timeout → toast with [Retry] [Try another model]
- Gemini quota → toast with [Switch to Grok] [Resets tomorrow]
- Offline → guide to free tools

Server-side rate limiting: global 100 req/min across all AI routes.

**Commit after implementation.**

---

### Task 35: Update .env.example + Documentation

**Files:**
- Verify: `.env.example` has all keys
- Verify: `docs/plans/2026-02-28-ai-features-mega-design.md` is accurate

**Commit after verification.**

---

### Task 36: Build Verify + Deploy

**Step 1: TypeScript check**
Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Build**
Run: `npx next build`
Expected: Build succeeds

**Step 3: Local test**
Run: `npm run dev`
Verify: AI toolbar visible, free features work, chat opens

**Step 4: Deploy**
Run: `npx vercel --prod`
Verify: Production build succeeds

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete AI features mega implementation (27 features)"
```

---

## Dependencies to Install

```bash
npm install onnxruntime-web @google/generative-ai openai replicate fal-client @anthropic-ai/sdk
```

Note: Some APIs (Remove.bg, Stability AI, Deep-Image.ai, xAI) use raw fetch — no SDK needed.

---

## Summary

| Metric | Count |
|--------|-------|
| Total tasks | 36 |
| New files | ~45 |
| Modified files | ~8 |
| New API routes | 9 |
| New components | 12 |
| New hooks | 5 |
| NPM packages | 6 |
| Phases | 10 |

---

*Created: 2026-02-28*
*Design doc: docs/plans/2026-02-28-ai-features-mega-design.md*
