export async function generateGeminiImage(prompt: string, model: string = "gemini-2.5-flash-image"): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not configured");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`);

  const data = await res.json() as {
    candidates: Array<{
      content: { parts: Array<{ inlineData?: { data: string; mimeType: string } }> }
    }>
  };

  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.mimeType?.startsWith("image/")
  );

  if (!imagePart?.inlineData) throw new Error("No image generated");
  return imagePart.inlineData.data; // base64
}
