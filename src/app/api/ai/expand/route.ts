import { NextRequest, NextResponse } from "next/server";
import { expandImage } from "@/lib/ai/providers/deep-image";
import { reserveCredits, refundCredits, logUsage, isBillingError } from "@/lib/ai/billing-guard";
import { validateImageData } from "@/lib/ai/input-limits";

const VALID_DIRECTIONS = new Set(["all", "left", "right", "top", "bottom"]);

export async function POST(request: NextRequest) {
  const { image, direction, pixels } = await request.json() as {
    image: string;
    direction?: string;
    pixels?: number;
  };
  if (!image) return NextResponse.json({ error: "画像が必要です" }, { status: 400 });

  const imageErr = validateImageData(image, "image");
  if (imageErr) return NextResponse.json({ error: imageErr }, { status: 400 });

  if (direction && !VALID_DIRECTIONS.has(direction)) {
    return NextResponse.json({ error: "direction が不正です" }, { status: 400 });
  }
  if (pixels !== undefined && (typeof pixels !== "number" || pixels < 1 || pixels > 2048)) {
    return NextResponse.json({ error: "pixels は 1〜2048 の範囲で指定してください" }, { status: 400 });
  }

  const billing = await reserveCredits("expand");
  if (isBillingError(billing)) return billing.response;

  try {
    const result = await expandImage(image, direction as "all" | "left" | "right" | "top" | "bottom" | undefined, pixels);
    await logUsage(billing.userId, "expand", billing.cost);
    return NextResponse.json({ image: result });
  } catch (err) {
    await refundCredits(billing.userId, "expand");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "画像拡張に失敗しました" },
      { status: 500 }
    );
  }
}
