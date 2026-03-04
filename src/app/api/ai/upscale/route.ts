import { NextRequest, NextResponse } from "next/server";
import { upscaleHD } from "@/lib/ai/providers/replicate";
import { reserveCredits, refundCredits, logUsage, isBillingError } from "@/lib/ai/billing-guard";

const MAX_URL_LENGTH = 4096;
const VALID_SCALES = new Set([2, 3, 4]);

export async function POST(request: NextRequest) {
  const { image_url, scale } = await request.json() as { image_url: string; scale?: number };
  if (!image_url) return NextResponse.json({ error: "画像URLが必要です" }, { status: 400 });

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

  // Scale validation
  const resolvedScale = scale ?? 4;
  if (!VALID_SCALES.has(resolvedScale)) {
    return NextResponse.json({ error: "scale は 2, 3, 4 のいずれかを指定してください" }, { status: 400 });
  }

  const billing = await reserveCredits("upscale");
  if (isBillingError(billing)) return billing.response;

  try {
    const resultUrl = await upscaleHD(image_url, resolvedScale);
    await logUsage(billing.userId, "upscale", billing.cost);
    return NextResponse.json({ image_url: resultUrl });
  } catch (err) {
    await refundCredits(billing.userId, "upscale");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "アップスケールに失敗しました" },
      { status: 500 }
    );
  }
}
