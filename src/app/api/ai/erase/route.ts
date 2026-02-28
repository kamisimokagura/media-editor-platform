import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { eraseObject } from "@/lib/ai/providers/stability";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { image, mask } = await request.json() as { image: string; mask: string };
  if (!image || !mask) {
    return NextResponse.json({ error: "image と mask が必要です" }, { status: 400 });
  }

  try {
    const result = await eraseObject(image, mask);
    return NextResponse.json({ image: result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "オブジェクト消去に失敗しました" },
      { status: 500 }
    );
  }
}
