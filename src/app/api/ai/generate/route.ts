import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateGeminiImage } from "@/lib/ai/providers/gemini-image";
import { generateOpenAIImage } from "@/lib/ai/providers/openai-image";
import { generateXAIImage } from "@/lib/ai/providers/xai";
import { generateFluxImage, generateRecraftImage } from "@/lib/ai/providers/fal";

interface GenerateRequest {
  prompt: string;
  model: string;
  size?: string;
  quality?: string;
}

const MODEL_HANDLERS: Record<string, (req: GenerateRequest) => Promise<{ image?: string; image_url?: string }>> = {
  "gemini-flash": async (req) => ({ image: await generateGeminiImage(req.prompt) }),
  "gpt-image": async (req) => ({ image: await generateOpenAIImage(req.prompt, { size: req.size, quality: req.quality }) }),
  "grok-aurora": async (req) => ({ image: await generateXAIImage(req.prompt) }),
  "flux-pro": async (req) => ({ image_url: await generateFluxImage(req.prompt, req.size) }),
  "recraft-v3": async (req) => ({ image_url: await generateRecraftImage(req.prompt) }),
};

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await request.json() as GenerateRequest;
  if (!body.prompt || !body.model) {
    return NextResponse.json({ error: "prompt と model が必要です" }, { status: 400 });
  }

  const handler = MODEL_HANDLERS[body.model];
  if (!handler) {
    return NextResponse.json({ error: `不明なモデル: ${body.model}` }, { status: 400 });
  }

  try {
    const result = await handler(body);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "画像生成に失敗しました" },
      { status: 500 }
    );
  }
}
