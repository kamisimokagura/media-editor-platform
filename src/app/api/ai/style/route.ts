import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { styleTransfer } from "@/lib/ai/providers/replicate";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { image_url, style_prompt } = await request.json() as { image_url: string; style_prompt: string };
  if (!image_url || !style_prompt) {
    return NextResponse.json({ error: "image_url と style_prompt が必要です" }, { status: 400 });
  }

  try {
    const resultUrl = await styleTransfer(image_url, style_prompt);
    return NextResponse.json({ image_url: resultUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "スタイル転送に失敗しました" },
      { status: 500 }
    );
  }
}
