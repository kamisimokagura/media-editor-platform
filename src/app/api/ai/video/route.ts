import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateFalVideo } from "@/lib/ai/providers/fal";
import { generateSoraVideo } from "@/lib/ai/providers/openai-image";
import { generateGrokVideo } from "@/lib/ai/providers/xai";

interface VideoRequest {
  prompt: string;
  model: string;
  image_url?: string;
  duration?: number;
  resolution?: string;
  aspect_ratio?: string;
}

const FAL_MODELS = ["seedance-2", "kling-3", "veo-3", "wan-2.6", "pika-2.5"];

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const body = await request.json() as VideoRequest;
  if (!body.prompt || !body.model) {
    return NextResponse.json({ error: "prompt と model が必要です" }, { status: 400 });
  }

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
      return NextResponse.json({ error: `不明なモデル: ${body.model}` }, { status: 400 });
    }

    return NextResponse.json({ video_url: videoUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "動画生成に失敗しました" },
      { status: 500 }
    );
  }
}
