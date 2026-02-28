const FAL_API = "https://queue.fal.run";

function getHeaders() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY not configured");
  return {
    Authorization: `Key ${key}`,
    "Content-Type": "application/json",
  };
}

interface FalQueueResponse {
  request_id: string;
  status: string;
}

interface FalResultResponse {
  status: string;
  result?: { images?: Array<{ url: string }>; video?: { url: string } };
}

async function submitAndPoll(endpoint: string, input: Record<string, unknown>): Promise<FalResultResponse> {
  // Submit to queue
  const submitRes = await fetch(`${FAL_API}/${endpoint}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ input }),
  });

  if (!submitRes.ok) throw new Error(`fal.ai submit error: ${await submitRes.text()}`);
  const { request_id } = await submitRes.json() as FalQueueResponse;

  // Poll for result (max 180s)
  const maxAttempts = 90;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));

    const statusRes = await fetch(`${FAL_API}/${endpoint}/requests/${request_id}/status`, {
      headers: getHeaders(),
    });

    if (!statusRes.ok) continue;
    const status = await statusRes.json() as { status: string };

    if (status.status === "COMPLETED") {
      const resultRes = await fetch(`${FAL_API}/${endpoint}/requests/${request_id}`, {
        headers: getHeaders(),
      });
      if (!resultRes.ok) throw new Error("Failed to fetch fal.ai result");
      return await resultRes.json() as FalResultResponse;
    }

    if (status.status === "FAILED") throw new Error("fal.ai generation failed");
  }

  throw new Error("fal.ai generation timed out");
}

// Image generation models
export async function generateFluxImage(prompt: string, size: string = "landscape_16_9"): Promise<string> {
  const result = await submitAndPoll("fal-ai/flux-pro/v1.1-ultra", {
    prompt,
    image_size: size,
    num_images: 1,
  });

  const url = result.result?.images?.[0]?.url;
  if (!url) throw new Error("No image in fal.ai result");
  return url;
}

export async function generateRecraftImage(prompt: string, style: string = "realistic_image"): Promise<string> {
  const result = await submitAndPoll("fal-ai/recraft-v3", {
    prompt,
    style,
    image_size: { width: 1024, height: 1024 },
  });

  const url = result.result?.images?.[0]?.url;
  if (!url) throw new Error("No image in fal.ai result");
  return url;
}

// Video generation models (used in Phase 7)
export async function generateVideo(
  model: string,
  input: Record<string, unknown>
): Promise<string> {
  const result = await submitAndPoll(model, input);

  const url = result.result?.video?.url;
  if (!url) throw new Error("No video in fal.ai result");
  return url;
}

// Video model endpoints
export const VIDEO_MODELS_FAL: Record<string, string> = {
  "seedance-2": "fal-ai/seedance",
  "kling-3": "fal-ai/kling-video/v2/master",
  "veo-3": "fal-ai/veo2",
  "wan-2.6": "fal-ai/wan/v2.1/1.3b",
  "pika-2.5": "fal-ai/pika/v2.2",
};

export async function generateFalVideo(
  modelKey: string,
  prompt: string,
  options: { image_url?: string; duration?: number; aspect_ratio?: string } = {}
): Promise<string> {
  const endpoint = VIDEO_MODELS_FAL[modelKey];
  if (!endpoint) throw new Error(`Unknown fal.ai video model: ${modelKey}`);

  const input: Record<string, unknown> = {
    prompt,
    ...(options.image_url && { image_url: options.image_url }),
    ...(options.duration && { duration: options.duration }),
    ...(options.aspect_ratio && { aspect_ratio: options.aspect_ratio }),
  };

  return generateVideo(endpoint, input);
}
