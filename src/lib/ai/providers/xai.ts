export async function generateXAIImage(prompt: string, model: string = "grok-2-image"): Promise<string> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY not configured");

  const res = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      response_format: "b64_json",
    }),
  });

  if (!res.ok) throw new Error(`xAI image error: ${await res.text()}`);

  const data = await res.json() as { data: Array<{ b64_json: string }> };
  if (!data.data?.[0]?.b64_json) throw new Error("No image generated");
  return data.data[0].b64_json;
}

export async function generateGrokVideo(
  prompt: string,
  options: { image_url?: string } = {}
): Promise<string> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY not configured");

  const res = await fetch("https://api.x.ai/v1/videos/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-2-video",
      prompt,
      ...(options.image_url && { image_url: options.image_url }),
    }),
  });

  if (!res.ok) throw new Error(`Grok video error: ${await res.text()}`);
  const data = await res.json() as { data: Array<{ url: string }> };
  if (!data.data?.[0]?.url) throw new Error("No video generated");
  return data.data[0].url;
}
