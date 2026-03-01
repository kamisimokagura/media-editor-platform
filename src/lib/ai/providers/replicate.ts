const REPLICATE_API = "https://api.replicate.com/v1";

function getHeaders() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN not configured");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function runReplicate(
  model: string,
  input: Record<string, unknown>
): Promise<string> {
  // Create prediction
  const createRes = await fetch(`${REPLICATE_API}/predictions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ model, input }),
  });

  if (!createRes.ok) throw new Error(`Replicate create error: ${createRes.statusText}`);
  let prediction = await createRes.json() as { id: string; status: string; output: unknown; error: unknown };

  // Poll for completion (max 120s)
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    if (prediction.status === "succeeded") {
      const output = prediction.output;
      if (typeof output === "string") return output;
      if (Array.isArray(output) && output.length > 0) return output[0] as string;
      throw new Error("Unexpected Replicate output format");
    }
    if (prediction.status === "failed" || prediction.status === "canceled") {
      throw new Error(`Replicate prediction failed: ${prediction.error}`);
    }

    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(`${REPLICATE_API}/predictions/${prediction.id}`, {
      headers: getHeaders(),
    });
    if (!pollRes.ok) throw new Error(`Replicate poll error: ${pollRes.statusText}`);
    prediction = await pollRes.json() as typeof prediction;
  }

  throw new Error("Replicate prediction timed out");
}

export async function upscaleHD(imageUrl: string, scale: number = 4): Promise<string> {
  return runReplicate("nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa", {
    image: imageUrl,
    scale,
    face_enhance: false,
  });
}

export async function styleTransfer(imageUrl: string, stylePrompt: string): Promise<string> {
  return runReplicate("tencentarc/photomaker-style:467d062309da518648ba89d226490e02b8ed09b5abc15026e54e31c5a8cd0571", {
    input_image: imageUrl,
    prompt: stylePrompt,
  });
}
