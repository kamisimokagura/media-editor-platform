import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { expandImage } from "@/lib/ai/providers/deep-image";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { image, direction, pixels } = await request.json() as {
    image: string;
    direction?: "all" | "left" | "right" | "top" | "bottom";
    pixels?: number;
  };
  if (!image) return NextResponse.json({ error: "画像が必要です" }, { status: 400 });

  try {
    const result = await expandImage(image, direction, pixels);
    return NextResponse.json({ image: result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "画像拡張に失敗しました" },
      { status: 500 }
    );
  }
}
