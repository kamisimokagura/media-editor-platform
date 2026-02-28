const STABILITY_API = "https://api.stability.ai/v2beta";

function getHeaders() {
  const key = process.env.STABILITY_API_KEY;
  if (!key) throw new Error("STABILITY_API_KEY not configured");
  return {
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
  };
}

export async function inpaintImage(
  imageBase64: string,
  maskBase64: string,
  prompt: string
): Promise<string> {
  const formData = new FormData();
  formData.append("image", new Blob([Buffer.from(imageBase64, "base64")], { type: "image/png" }));
  formData.append("mask", new Blob([Buffer.from(maskBase64, "base64")], { type: "image/png" }));
  formData.append("prompt", prompt);
  formData.append("output_format", "png");

  const res = await fetch(`${STABILITY_API}/stable-image/edit/inpaint`, {
    method: "POST",
    headers: {
      Authorization: getHeaders().Authorization,
      Accept: "application/json",
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Stability inpaint error: ${err}`);
  }

  const data = await res.json() as { image: string };
  return data.image; // base64
}

export async function eraseObject(
  imageBase64: string,
  maskBase64: string
): Promise<string> {
  const formData = new FormData();
  formData.append("image", new Blob([Buffer.from(imageBase64, "base64")], { type: "image/png" }));
  formData.append("mask", new Blob([Buffer.from(maskBase64, "base64")], { type: "image/png" }));
  formData.append("output_format", "png");

  const res = await fetch(`${STABILITY_API}/stable-image/edit/erase`, {
    method: "POST",
    headers: {
      Authorization: getHeaders().Authorization,
      Accept: "application/json",
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Stability erase error: ${err}`);
  }

  const data = await res.json() as { image: string };
  return data.image;
}
