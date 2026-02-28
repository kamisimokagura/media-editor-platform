export async function expandImage(
  imageBase64: string,
  direction: "all" | "left" | "right" | "top" | "bottom" = "all",
  pixels: number = 256
): Promise<string> {
  const apiKey = process.env.DEEP_IMAGE_API_KEY;
  if (!apiKey) throw new Error("DEEP_IMAGE_API_KEY not configured");

  const res = await fetch("https://deep-image.ai/rest_api/process_result", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      url: `data:image/png;base64,${imageBase64}`,
      width: direction === "left" || direction === "right" ? `+${pixels}` : undefined,
      height: direction === "top" || direction === "bottom" ? `+${pixels}` : undefined,
      background: { generate: true },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Deep-Image expand error: ${err}`);
  }

  const data = await res.json() as { result_url: string };

  // Fetch result image and convert to base64
  const imgRes = await fetch(data.result_url);
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
  return imgBuffer.toString("base64");
}
