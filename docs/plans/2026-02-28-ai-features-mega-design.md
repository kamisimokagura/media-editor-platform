# AI Features Mega Design - MediaEditor Platform

> Date: 2026-02-28
> Status: Approved
> Approach: 2-Layer AI Architecture (Browser + Cloud API)

## 1. Overview

MediaEditor Platform に27のAI機能を追加する。無料層（ブラウザ内AI）と有料層（クラウドAPI）の2層アーキテクチャで、無料ユーザーにも実用的なAI体験を提供しつつ、有料APIで差別化する。

### Design Principles
- 無料層は完全ブラウザ内実行（サーバーコストゼロ）
- 有料層は成功時のみクレジット消費（失敗時は課金しない）
- 非破壊編集（AI処理はレイヤーとして適用）
- コンテキスト認識UI（状況に応じてAIアクションを提案）

## 2. Feature List

### Free Tier (Browser-based AI)

| # | Feature | Technology | Description |
|---|---------|-----------|-------------|
| 1 | Auto Enhance | Canvas API | Histogram analysis + auto brightness/contrast/color temperature |
| 2 | Lightweight Upscale (2x) | ONNX Runtime (Real-ESRGAN lite) | Browser-based image upscaling |
| 3 | Denoise | ONNX Runtime | Photo noise reduction |
| 4 | Face Detection | ONNX Runtime | Detect faces for auto-enhance or mosaic |
| 5 | Smart Crop | ONNX Runtime (saliency) | Auto-detect subject and suggest optimal crop |

### Paid Tier - Image Editing (Credit-based)

| # | Feature | API/Model | Credits |
|---|---------|-----------|---------|
| 6 | Background Removal (HD) | Remove.bg | 2 |
| 7 | Upscale 4x/8x | Replicate (Real-ESRGAN) | 3 |
| 8 | Generative Fill | Stability AI Inpaint | 5 |
| 9 | Object Removal | Stability AI Erase | 3 |
| 10 | Image Expansion (Outpaint) | Deep-Image.ai | 4 |
| 11 | Style Transfer | Replicate | 3 |

### Paid Tier - Image Generation (Credit-based)

| # | Feature | API/Model | Credits |
|---|---------|-----------|---------|
| 12 | Fast Generation | Nano Banana 2 (Gemini API) | 3 |
| 13 | Highest Quality | Nano Banana Pro (Gemini 3 Pro) | 5 |
| 14 | Text Accuracy | GPT Image 1.5 (OpenAI) | 5 |
| 15 | Photorealism | FLUX.2 (Black Forest Labs) | 4 |
| 16 | Design-focused | Recraft V4 (fal.ai) | 4 |
| 17 | Cost-effective Photorealism | Grok Aurora (xAI) | 3 |

### Paid Tier - Video Generation (Credit-based)

| # | Feature | API/Model | Credits |
|---|---------|-----------|---------|
| 18 | Cinema Quality | Seedance 2.0 (fal.ai) | 10 |
| 19 | Highest Quality | Sora 2 (OpenAI) | 12 |
| 20 | Fast Generation | Kling 3.0 (fal.ai) | 8 |
| 21 | Lip Sync | Veo 3.1 (Google/fal.ai) | 10 |
| 22 | Cost-effective | Wan 2.6 (fal.ai) | 6 |
| 23 | Social Media | Pika 2.5 | 5 |
| 24 | Audio-synced Video | Grok Imagine 1.0 (xAI) | 8 |

### AI Assistants

| # | Feature | API/Model | Credits |
|---|---------|-----------|---------|
| 25 | Free Assistant | Gemini API (free tier) | 0 |
| 26 | Premium Assistant | Claude API | 2/conversation |
| 27 | Cost-effective Assistant | Grok 4.1 (xAI) | 1/conversation |

## 3. Pricing Model

| Plan | Free Tier | Paid Tier |
|------|-----------|-----------|
| Free | All features unlimited | 5 credits/month |
| AI Lite (480 JPY/mo) | All features unlimited | 100 credits/month |
| AI Pro (980 JPY/mo) | All features unlimited | 500 credits/month |
| Credit Packs | - | One-time purchase |

## 4. Architecture

```
Frontend (Next.js)
├── AI Toolbar (sidebar)
├── AI Chat Panel (right side, toggle)
├── AI Generate Modal (image/video)
├── Context Taskbar (floating, context-aware)
└── AI Result Layer (non-destructive overlay)
        │
        ├── Browser AI Engine
        │   ├── Canvas API (auto-enhance, analysis)
        │   ├── ONNX Runtime WASM (upscale, denoise, face, bg-remove, saliency)
        │   └── Gemini API (free assistant, free tier)
        │
        └── /api/ai/* (Server-side)
            ├── credits/route.ts (existing - check/consume)
            ├── usage/route.ts (existing - tier info)
            ├── chat/route.ts (Gemini/Claude/Grok streaming)
            ├── generate/route.ts (image generation - multi-model)
            ├── video/route.ts (video generation - multi-model)
            ├── remove-bg/route.ts (Remove.bg)
            ├── upscale/route.ts (Replicate Real-ESRGAN)
            ├── inpaint/route.ts (Stability AI)
            ├── erase/route.ts (Stability AI)
            ├── expand/route.ts (Deep-Image.ai outpaint)
            └── style/route.ts (Replicate style transfer)
                    │
                    ▼
            External APIs
            ├── fal.ai (hub for video/image models)
            ├── Remove.bg
            ├── Gemini API (Nano Banana 2/Pro)
            ├── OpenAI (GPT Image 1.5, Sora 2)
            ├── Stability AI (Inpaint, Erase)
            ├── xAI (Grok Aurora, Imagine, 4.1)
            ├── Replicate (FLUX.2, Real-ESRGAN, style)
            └── Deep-Image.ai (outpaint)
```

### File Structure (New Files)

```
src/
├── lib/ai/
│   ├── router.ts              # Free/paid routing logic
│   ├── browser/
│   │   ├── auto-enhance.ts    # Canvas auto-correction
│   │   ├── upscale.ts         # ONNX upscaling
│   │   ├── denoise.ts         # ONNX denoising
│   │   ├── face-detect.ts     # ONNX face detection
│   │   ├── bg-remove.ts       # ONNX lightweight bg removal
│   │   └── smart-crop.ts      # ONNX saliency detection
│   ├── models/
│   │   └── model-manager.ts   # ONNX model loading + IndexedDB cache
│   └── providers/
│       ├── fal.ts             # fal.ai API client
│       ├── removebg.ts        # Remove.bg client
│       ├── stability.ts       # Stability AI client
│       ├── openai-image.ts    # OpenAI image/video client
│       ├── gemini-image.ts    # Gemini Nano Banana client
│       ├── xai.ts             # Grok Aurora/Imagine client
│       ├── replicate.ts       # Replicate client
│       └── deep-image.ts      # Deep-Image.ai client
├── app/api/ai/
│   ├── credits/route.ts       # (existing)
│   ├── usage/route.ts         # (existing)
│   ├── chat/route.ts          # AI assistant (streaming)
│   ├── generate/route.ts      # Image generation (multi-model)
│   ├── video/route.ts         # Video generation (multi-model)
│   ├── remove-bg/route.ts     # Background removal
│   ├── upscale/route.ts       # HD upscaling
│   ├── inpaint/route.ts       # Generative fill
│   ├── erase/route.ts         # Object removal
│   ├── expand/route.ts        # Image expansion
│   └── style/route.ts         # Style transfer
├── components/ai/
│   ├── AIToolbar.tsx           # AI feature buttons in sidebar
│   ├── AIChatPanel.tsx         # Conversational assistant UI
│   ├── AIGenerateModal.tsx     # Image generation modal
│   ├── AIVideoModal.tsx        # Video generation modal
│   ├── AIResultLayer.tsx       # Non-destructive result overlay
│   ├── ContextTaskbar.tsx      # Floating context-aware action bar
│   ├── CreditBadge.tsx         # Remaining credits display
│   ├── CreditGate.tsx          # Credit check wrapper component
│   ├── ModelSelector.tsx       # Model selection cards
│   └── ToolChain.tsx           # "Next steps" suggestion after AI action
├── hooks/
│   ├── useAIFeature.ts         # Common AI feature hook (routing + error)
│   ├── useOnnxModel.ts         # ONNX model loading + inference
│   ├── useAIChat.ts            # Chat streaming hook
│   ├── useAILayers.ts          # Non-destructive AI layer management
│   └── useCredits.ts           # Credit check + consumption hook
└── stores/
    └── aiStore.ts              # AI state (layers, chat history, models loaded)
```

## 5. UI Design

### Design References
- **Photoshop 2026**: Contextual Taskbar, Generative Fill with reference images, non-destructive layers
- **Canva Magic Studio**: One-click Magic tools, tool chaining
- **Clipdrop**: Minimal drag-apply-download flow, sequential tool chaining
- **Midjourney Editor**: Paint selection + generation, aspect ratio presets
- **2026 AI UI Trends**: Dark base (#0A0A0F) + frosted glass panels, context-aware sidepanels

### Color Theme
```css
--bg-base:       #0A0A0F;
--bg-surface:    #12121A;
--bg-frost:      rgba(255,255,255,0.05);
--border-subtle: rgba(255,255,255,0.08);
--accent-ai:     #8B5CF6;      /* AI accent (purple) */
--accent-free:   #10B981;      /* Free features (green) */
--accent-paid:   #F59E0B;      /* Paid features (orange) */
--text-primary:  #F1F5F9;
--text-secondary:#94A3B8;
```

### Key UI Components

1. **Context Taskbar** - Floats below canvas, shows relevant AI actions based on current state
   - Photo loaded → auto-enhance, bg-remove, upscale, style
   - Area selected (brush) → generative fill, erase, style (+ prompt input + reference image upload)
   - Face detected → face enhance, mosaic, beauty filter

2. **AI Chat Panel** - Right side, toggle, frosted glass
   - LLM selector (Gemini free / Claude 2cr / Grok 1cr)
   - Context-aware: analyzes current image and suggests actions
   - Action buttons inline with chat: click to apply edits instantly
   - Streaming responses

3. **AI Result Layer** - Non-destructive overlay
   - Before/After slider (extends existing CompareView)
   - Layer panel: toggle AI effects on/off
   - [Apply] [Undo] [Try another model]

4. **Tool Chain** - Post-action suggestions (Clipdrop-inspired)
   - After bg-remove → [Generate new bg] [Upscale] [Resize] [Save PNG]
   - After upscale → [Denoise] [Auto-enhance] [Export]

5. **Generation Modals** - Image & Video
   - Model selection cards with pricing + feature tags
   - Reference image upload (Photoshop 2026 style)
   - Aspect ratio presets
   - Result gallery with history
   - [Edit in editor] [Download] [Variations] [Regenerate]

6. **Mobile Layout**
   - Bottom sheet for AI tools (swipeable)
   - Contextual bar as horizontal scroll
   - Chat as fullscreen modal
   - Bottom tab navigation: [Adjust] [Crop] [AI] [Chat]

## 6. Data Flow

### Credit Safety
1. Frontend optimistic check (UX)
2. Server-side re-check (race condition prevention)
3. External API call
4. Credit consumed ONLY on success
5. Failure → no credit deducted
6. Video generation: reserve on start, auto-refund on failure

### ONNX Model Management
- CDN-hosted .onnx files (~36MB total, individually loaded)
- IndexedDB caching (load once, use forever)
- Version check on app load (update if newer)
- Models: real-esrgan-lite (~15MB), u2net-lite (~5MB), denoise-lite (~8MB), face-detect (~3MB), saliency (~5MB)

### Rate Limiting
- Gemini free: 15 RPM / 1M tokens/month → fallback to Grok on exceed
- fal.ai: pay-per-use, server-side global limit 100 req/min
- Remove.bg: paid plan, no hard limit
- OpenAI/xAI: exponential backoff on 429

## 7. Error Handling

| Error | Detection | User Message | Recovery |
|-------|-----------|-------------|----------|
| Insufficient credits | Frontend check + API 402 | "Credits insufficient" modal | [Top up] [Change plan] |
| ONNX model load fail | fetch error / WASM init fail | Toast: "AI model load failed" | [Retry] + CDN fallback |
| External API timeout | 30s timeout | "Processing taking longer than expected" | [Retry] [Try another model] |
| External API error | 4xx/5xx response | Toast: "Processing failed: {reason}" | [Retry], credits not consumed |
| Image too large | Frontend + API validation | "Image too large (max: 20MB)" | [Resize and retry] |
| Gemini quota exceeded | API 429 | "Free quota exceeded" | [Switch to Grok 1cr] [Resets tomorrow] |
| Offline | navigator.onLine / fetch fail | "Offline. Free tools available." | Guide to Canvas/ONNX tools |
| Browser unsupported | WASM/WebGL feature detection | "AI features limited in this browser" | Fallback to paid API |

## 8. Environment Variables (New)

```env
# fal.ai (hub for video/image models)
FAL_KEY=

# Stability AI
STABILITY_API_KEY=

# OpenAI (GPT Image, Sora)
OPENAI_API_KEY=

# Gemini (Nano Banana, assistant)
GOOGLE_GENERATIVE_AI_API_KEY=

# xAI Grok (Aurora, Imagine, 4.1)
XAI_API_KEY=

# Replicate (FLUX.2, Real-ESRGAN, style)
REPLICATE_API_TOKEN=

# Deep-Image.ai
DEEP_IMAGE_API_KEY=

# Remove.bg (already in .env.example)
REMOVEBG_API_KEY=
```

---

*Approved: 2026-02-28*
