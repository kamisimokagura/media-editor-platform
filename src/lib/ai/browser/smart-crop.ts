import type { InferenceSession } from "onnxruntime-web";

export interface CropSuggestion {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
}

export async function suggestSmartCrop(
  session: InferenceSession,
  imageData: ImageData,
  targetAspectRatio?: number // e.g., 16/9, 1, 4/3
): Promise<CropSuggestion> {
  const ort = await import("onnxruntime-web");
  const { width, height, data } = imageData;

  // Resize for saliency model (224x224 typical)
  const modelSize = 224;
  const float32Data = new Float32Array(3 * modelSize * modelSize);

  for (let y = 0; y < modelSize; y++) {
    for (let x = 0; x < modelSize; x++) {
      const srcX = Math.floor((x / modelSize) * width);
      const srcY = Math.floor((y / modelSize) * height);
      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = y * modelSize + x;
      float32Data[dstIdx] = data[srcIdx] / 255;
      float32Data[modelSize * modelSize + dstIdx] = data[srcIdx + 1] / 255;
      float32Data[2 * modelSize * modelSize + dstIdx] = data[srcIdx + 2] / 255;
    }
  }

  const inputTensor = new ort.Tensor("float32", float32Data, [1, 3, modelSize, modelSize]);
  const inputName = session.inputNames[0];
  const results = await session.run({ [inputName]: inputTensor });
  const saliencyMap = results[session.outputNames[0]].data as Float32Array;

  // Find center of mass of saliency
  let totalWeight = 0;
  let cx = 0, cy = 0;

  for (let y = 0; y < modelSize; y++) {
    for (let x = 0; x < modelSize; x++) {
      const w = Math.max(0, saliencyMap[y * modelSize + x] as number);
      totalWeight += w;
      cx += x * w;
      cy += y * w;
    }
  }

  if (totalWeight > 0) {
    cx /= totalWeight;
    cy /= totalWeight;
  } else {
    cx = modelSize / 2;
    cy = modelSize / 2;
  }

  // Scale back to original image coordinates
  const centerX = (cx / modelSize) * width;
  const centerY = (cy / modelSize) * height;

  // Determine crop size
  const aspect = targetAspectRatio ?? width / height;
  let cropW: number, cropH: number;

  if (aspect >= 1) {
    cropW = Math.min(width, Math.round(width * 0.8));
    cropH = Math.round(cropW / aspect);
    if (cropH > height) {
      cropH = height;
      cropW = Math.round(cropH * aspect);
    }
  } else {
    cropH = Math.min(height, Math.round(height * 0.8));
    cropW = Math.round(cropH * aspect);
    if (cropW > width) {
      cropW = width;
      cropH = Math.round(cropW / aspect);
    }
  }

  // Center crop around the saliency center, clamped to image bounds
  const cropX = Math.max(0, Math.min(width - cropW, Math.round(centerX - cropW / 2)));
  const cropY = Math.max(0, Math.min(height - cropH, Math.round(centerY - cropH / 2)));

  return {
    x: cropX,
    y: cropY,
    width: cropW,
    height: cropH,
    score: totalWeight / (modelSize * modelSize),
  };
}
