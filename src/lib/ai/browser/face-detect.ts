import type { InferenceSession } from "onnxruntime-web";

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export async function detectFaces(
  session: InferenceSession,
  imageData: ImageData
): Promise<FaceBox[]> {
  const ort = await import("onnxruntime-web");
  const { width, height, data } = imageData;

  // Resize to model input size (320x240 typical for face detection)
  const modelW = 320;
  const modelH = 240;
  const float32Data = new Float32Array(3 * modelH * modelW);

  for (let y = 0; y < modelH; y++) {
    for (let x = 0; x < modelW; x++) {
      const srcX = Math.floor((x / modelW) * width);
      const srcY = Math.floor((y / modelH) * height);
      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = y * modelW + x;

      // Normalize to [0,1]
      float32Data[dstIdx] = data[srcIdx] / 255;
      float32Data[modelH * modelW + dstIdx] = data[srcIdx + 1] / 255;
      float32Data[2 * modelH * modelW + dstIdx] = data[srcIdx + 2] / 255;
    }
  }

  const inputTensor = new ort.Tensor("float32", float32Data, [1, 3, modelH, modelW]);
  const inputName = session.inputNames[0];
  const results = await session.run({ [inputName]: inputTensor });

  // Parse detections - format depends on model but typically [N, 5] (x1, y1, x2, y2, confidence)
  const outputName = session.outputNames[0];
  const outputData = results[outputName].data as Float32Array;
  const dims = results[outputName].dims;

  const faces: FaceBox[] = [];
  const numDetections = dims.length >= 2 ? Number(dims[dims.length - 2]) : Math.floor(outputData.length / 5);
  const stride = dims.length >= 2 ? Number(dims[dims.length - 1]) : 5;

  for (let i = 0; i < numDetections; i++) {
    const offset = i * stride;
    const confidence = outputData[offset + 4] as number;

    if (confidence < 0.5) continue;

    const x1 = (outputData[offset] as number) * width / modelW;
    const y1 = (outputData[offset + 1] as number) * height / modelH;
    const x2 = (outputData[offset + 2] as number) * width / modelW;
    const y2 = (outputData[offset + 3] as number) * height / modelH;

    faces.push({
      x: Math.max(0, x1),
      y: Math.max(0, y1),
      width: Math.max(0, x2 - x1),
      height: Math.max(0, y2 - y1),
      confidence,
    });
  }

  // Sort by confidence descending
  faces.sort((a, b) => b.confidence - a.confidence);

  return faces;
}
