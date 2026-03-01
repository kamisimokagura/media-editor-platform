import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { upscaleHD } from "@/lib/ai/providers/replicate";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { image_url, scale } = await request.json() as { image_url: string; scale?: number };
  if (!image_url) return NextResponse.json({ error: "画像URLが必要です" }, { status: 400 });

  try {
    const resultUrl = await upscaleHD(image_url, scale ?? 4);
    return NextResponse.json({ image_url: resultUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "アップスケールに失敗しました" },
      { status: 500 }
    );
  }
}
