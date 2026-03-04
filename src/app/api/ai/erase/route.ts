import { NextRequest, NextResponse } from "next/server";
import { eraseObject } from "@/lib/ai/providers/stability";
import { reserveCredits, refundCredits, logUsage, isBillingError } from "@/lib/ai/billing-guard";
import { validateImageData } from "@/lib/ai/input-limits";

export async function POST(request: NextRequest) {
  const { image, mask } = await request.json() as { image: string; mask: string };
  if (!image || !mask) {
    return NextResponse.json({ error: "image と mask が必要です" }, { status: 400 });
  }

  const imageErr = validateImageData(image, "image");
  if (imageErr) return NextResponse.json({ error: imageErr }, { status: 400 });
  const maskErr = validateImageData(mask, "mask");
  if (maskErr) return NextResponse.json({ error: maskErr }, { status: 400 });

  const billing = await reserveCredits("erase");
  if (isBillingError(billing)) return billing.response;

  try {
    const result = await eraseObject(image, mask);
    await logUsage(billing.userId, "erase", billing.cost);
    return NextResponse.json({ image: result });
  } catch (err) {
    await refundCredits(billing.userId, "erase");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "オブジェクト消去に失敗しました" },
      { status: 500 }
    );
  }
}
