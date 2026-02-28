import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { inpaintImage } from "@/lib/ai/providers/stability";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { image, mask, prompt } = await request.json() as { image: string; mask: string; prompt: string };
  if (!image || !mask || !prompt) {
    return NextResponse.json({ error: "image, mask, prompt が必要です" }, { status: 400 });
  }

  try {
    const result = await inpaintImage(image, mask, prompt);
    return NextResponse.json({ image: result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "インペイントに失敗しました" },
      { status: 500 }
    );
  }
}
