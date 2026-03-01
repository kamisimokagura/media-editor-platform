import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { removeBackground } from "@/lib/ai/providers/removebg";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { image } = await request.json() as { image: string };
  if (!image) return NextResponse.json({ error: "画像が必要です" }, { status: 400 });

  try {
    const result = await removeBackground(image);
    return NextResponse.json({ image: result.toString("base64") });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "背景除去に失敗しました" },
      { status: 500 }
    );
  }
}
