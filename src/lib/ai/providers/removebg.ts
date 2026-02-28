export async function removeBackground(imageBase64: string): Promise<Buffer> {
  const apiKey = process.env.REMOVEBG_API_KEY;
  if (!apiKey) throw new Error("REMOVEBG_API_KEY not configured");

  const res = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      image_file_b64: imageBase64,
      size: "auto",
      format: "png",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Remove.bg error: ${(err as Record<string, unknown>).errors ?? res.statusText}`);
  }

  const data = await res.json();
  return Buffer.from((data as { data: { result_b64: string } }).data.result_b64, "base64");
}
