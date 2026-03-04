import { NextRequest, NextResponse } from "next/server";
import { removeBackground } from "@/lib/ai/providers/removebg";
import { reserveCredits, refundCredits, logUsage, isBillingError } from "@/lib/ai/billing-guard";
import { validateImageData } from "@/lib/ai/input-limits";

export async function POST(request: NextRequest) {
  const { image } = await request.json() as { image: string };
  if (!image) return NextResponse.json({ error: "画像が必要です" }, { status: 400 });

  const imageErr = validateImageData(image, "image");
  if (imageErr) return NextResponse.json({ error: imageErr }, { status: 400 });

  const billing = await reserveCredits("remove-bg");
  if (isBillingError(billing)) return billing.response;

  try {
    const result = await removeBackground(image);
    await logUsage(billing.userId, "remove-bg", billing.cost);
    return NextResponse.json({ image: result.toString("base64") });
  } catch (err) {
    await refundCredits(billing.userId, "remove-bg");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "背景除去に失敗しました" },
      { status: 500 }
    );
  }
}
