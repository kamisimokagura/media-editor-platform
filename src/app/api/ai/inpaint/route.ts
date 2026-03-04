import { NextRequest, NextResponse } from "next/server";
import { inpaintImage } from "@/lib/ai/providers/stability";
import { reserveCredits, refundCredits, logUsage, isBillingError } from "@/lib/ai/billing-guard";
import { validatePrompt, validateImageData } from "@/lib/ai/input-limits";

export async function POST(request: NextRequest) {
  const { image, mask, prompt } = await request.json() as { image: string; mask: string; prompt: string };
  if (!image || !mask || !prompt) {
    return NextResponse.json({ error: "image, mask, prompt が必要です" }, { status: 400 });
  }

  const promptErr = validatePrompt(prompt);
  if (promptErr) return NextResponse.json({ error: promptErr }, { status: 400 });
  const imageErr = validateImageData(image, "image");
  if (imageErr) return NextResponse.json({ error: imageErr }, { status: 400 });
  const maskErr = validateImageData(mask, "mask");
  if (maskErr) return NextResponse.json({ error: maskErr }, { status: 400 });

  const billing = await reserveCredits("inpaint");
  if (isBillingError(billing)) return billing.response;

  try {
    const result = await inpaintImage(image, mask, prompt);
    await logUsage(billing.userId, "inpaint", billing.cost);
    return NextResponse.json({ image: result });
  } catch (err) {
    await refundCredits(billing.userId, "inpaint");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "インペイントに失敗しました" },
      { status: 500 }
    );
  }
}
