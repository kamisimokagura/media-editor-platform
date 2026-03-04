import { NextRequest, NextResponse } from "next/server";
import { styleTransfer } from "@/lib/ai/providers/replicate";
import { reserveCredits, refundCredits, logUsage, isBillingError } from "@/lib/ai/billing-guard";
import { validatePrompt } from "@/lib/ai/input-limits";

/** Max URL length */
const MAX_URL_LENGTH = 4096;

export async function POST(request: NextRequest) {
  const { image_url, style_prompt } = await request.json() as { image_url: string; style_prompt: string };
  if (!image_url || !style_prompt) {
    return NextResponse.json({ error: "image_url と style_prompt が必要です" }, { status: 400 });
  }

  // URL validation
  if (typeof image_url !== "string" || image_url.length > MAX_URL_LENGTH) {
    return NextResponse.json({ error: "image_url が不正です" }, { status: 400 });
  }
  try {
    const parsed = new URL(image_url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return NextResponse.json({ error: "image_url は http/https のみ対応です" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "image_url が不正なURLです" }, { status: 400 });
  }

  const promptErr = validatePrompt(style_prompt);
  if (promptErr) return NextResponse.json({ error: promptErr }, { status: 400 });

  const billing = await reserveCredits("style");
  if (isBillingError(billing)) return billing.response;

  try {
    const resultUrl = await styleTransfer(image_url, style_prompt);
    await logUsage(billing.userId, "style", billing.cost);
    return NextResponse.json({ image_url: resultUrl });
  } catch (err) {
    await refundCredits(billing.userId, "style");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "スタイル転送に失敗しました" },
      { status: 500 }
    );
  }
}
