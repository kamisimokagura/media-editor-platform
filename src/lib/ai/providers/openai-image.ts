export async function generateOpenAIImage(
  prompt: string,
  options: { size?: string; quality?: string; model?: string } = {}
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const { size = "1024x1024", quality = "standard", model = "gpt-image-1" } = options;

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size,
      quality,
      response_format: "b64_json",
    }),
  });

  if (!res.ok) throw new Error(`OpenAI image error: ${await res.text()}`);

  const data = await res.json() as { data: Array<{ b64_json: string }> };
  if (!data.data?.[0]?.b64_json) throw new Error("No image generated");
  return data.data[0].b64_json;
}

export async function generateSoraVideo(
  prompt: string,
  options: { duration?: number; resolution?: string } = {}
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const res = await fetch("https://api.openai.com/v1/videos/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sora",
      prompt,
      duration: options.duration ?? 5,
      resolution: options.resolution ?? "1080p",
    }),
  });

  if (!res.ok) throw new Error(`Sora error: ${await res.text()}`);
  const data = await res.json() as { data: Array<{ url: string }> };
  if (!data.data?.[0]?.url) throw new Error("No video generated");
  return data.data[0].url;
}
