import { NextRequest, NextResponse } from "next/server";
import { generateFalVideo } from "@/lib/ai/providers/fal";
import { generateSoraVideo } from "@/lib/ai/providers/openai-image";
import { generateGrokVideo } from "@/lib/ai/providers/xai";
import { reserveCredits, refundCredits, logUsage, isBillingError } from "@/lib/ai/billing-guard";
import { validatePrompt } from "@/lib/ai/input-limits";

interface VideoRequest {
  prompt: string;
  model: string;
  image_url?: string;
  duration?: number;
  resolution?: string;
  aspect_ratio?: string;
}

const FAL_MODELS = ["seedance-2", "kling-3", "veo-3", "wan-2.6", "pika-2.5"];
const ALL_MODELS = new Set([...FAL_MODELS, "sora", "grok-imagine"]);
const MAX_URL_LENGTH = 4096;
const VALID_ASPECT_RATIOS = new Set(["16:9", "9:16", "1:1", "4:3", "3:4"]);

export async function POST(request: NextRequest) {
  const body = await request.json() as VideoRequest;

  const promptErr = validatePrompt(body.prompt);
  if (promptErr) return NextResponse.json({ error: promptErr }, { status: 400 });

  if (!body.model || !ALL_MODELS.has(body.model)) {
    return NextResponse.json({ error: `不明なモデル: ${body.model}` }, { status: 400 });
  }

  // Optional URL validation
  if (body.image_url) {
    if (typeof body.image_url !== "string" || body.image_url.length > MAX_URL_LENGTH) {
      return NextResponse.json({ error: "image_url が不正です" }, { status: 400 });
    }
    try {
      const parsed = new URL(body.image_url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return NextResponse.json({ error: "image_url は http/https のみ対応です" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "image_url が不正なURLです" }, { status: 400 });
    }
  }

  // Duration validation
  if (body.duration !== undefined && (typeof body.duration !== "number" || body.duration < 1 || body.duration > 30)) {
    return NextResponse.json({ error: "duration は 1〜30秒の範囲で指定してください" }, { status: 400 });
  }

  // Aspect ratio validation
  if (body.aspect_ratio && !VALID_ASPECT_RATIOS.has(body.aspect_ratio)) {
    return NextResponse.json({ error: "aspect_ratio が不正です。16:9, 9:16, 1:1, 4:3, 3:4 のいずれかを指定してください" }, { status: 400 });
  }

  const billing = await reserveCredits("video", body.model);
  if (isBillingError(billing)) return billing.response;

  try {
    let videoUrl: string;

    if (FAL_MODELS.includes(body.model)) {
      videoUrl = await generateFalVideo(body.model, body.prompt, {
        image_url: body.image_url,
        duration: body.duration,
        aspect_ratio: body.aspect_ratio,
      });
    } else if (body.model === "sora") {
      videoUrl = await generateSoraVideo(body.prompt, {
        duration: body.duration,
        resolution: body.resolution,
      });
    } else if (body.model === "grok-imagine") {
      videoUrl = await generateGrokVideo(body.prompt, {
        image_url: body.image_url,
      });
    } else {
      await refundCredits(billing.userId, "video", body.model);
      return NextResponse.json({ error: `不明なモデル: ${body.model}` }, { status: 400 });
    }

    await logUsage(billing.userId, "video", billing.cost, { model: body.model });
    return NextResponse.json({ video_url: videoUrl });
  } catch (err) {
    await refundCredits(billing.userId, "video", body.model);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "動画生成に失敗しました" },
      { status: 500 }
    );
  }
}
