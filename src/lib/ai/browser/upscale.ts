import type { InferenceSession } from "onnxruntime-web";

/**
 * Run Real-ESRGAN lite inference for 2x upscaling.
 * Input: ImageData → preprocessed tensor → inference → output ImageData (2x resolution)
 */
export async function upscaleImage(
  session: InferenceSession,
  imageData: ImageData
): Promise<ImageData> {
  const ort = await import("onnxruntime-web");
  const { width, height, data } = imageData;

  // Preprocess: NHWC uint8 → NCHW float32 normalized [0,1]
  const float32Data = new Float32Array(3 * height * width);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * width + x;
      float32Data[dstIdx] = data[srcIdx] / 255;                    // R
      float32Data[height * width + dstIdx] = data[srcIdx + 1] / 255; // G
      float32Data[2 * height * width + dstIdx] = data[srcIdx + 2] / 255; // B
    }
  }

  const inputTensor = new ort.Tensor("float32", float32Data, [1, 3, height, width]);
  const inputName = session.inputNames[0];
  const results = await session.run({ [inputName]: inputTensor });
  const outputTensor = results[session.outputNames[0]];

  // Output shape: [1, 3, H*2, W*2]
  const outH = height * 2;
  const outW = width * 2;
  const outData = outputTensor.data as Float32Array;

  const outImageData = new ImageData(outW, outH);
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const idx = y * outW + x;
      const dstIdx = idx * 4;
      outImageData.data[dstIdx] = Math.round(Math.max(0, Math.min(255, (outData[idx] as number) * 255)));
      outImageData.data[dstIdx + 1] = Math.round(Math.max(0, Math.min(255, (outData[outH * outW + idx] as number) * 255)));
      outImageData.data[dstIdx + 2] = Math.round(Math.max(0, Math.min(255, (outData[2 * outH * outW + idx] as number) * 255)));
      outImageData.data[dstIdx + 3] = 255;
    }
  }

  return outImageData;
}
