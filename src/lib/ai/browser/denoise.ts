import type { InferenceSession } from "onnxruntime-web";

export async function denoiseImage(
  session: InferenceSession,
  imageData: ImageData
): Promise<ImageData> {
  const ort = await import("onnxruntime-web");
  const { width, height, data } = imageData;

  const float32Data = new Float32Array(3 * height * width);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * width + x;
      float32Data[dstIdx] = data[srcIdx] / 255;
      float32Data[height * width + dstIdx] = data[srcIdx + 1] / 255;
      float32Data[2 * height * width + dstIdx] = data[srcIdx + 2] / 255;
    }
  }

  const inputTensor = new ort.Tensor("float32", float32Data, [1, 3, height, width]);
  const inputName = session.inputNames[0];
  const results = await session.run({ [inputName]: inputTensor });
  const outputTensor = results[session.outputNames[0]];
  const outData = outputTensor.data as Float32Array;

  const outImageData = new ImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const dstIdx = idx * 4;
      outImageData.data[dstIdx] = Math.round(Math.max(0, Math.min(255, (outData[idx] as number) * 255)));
      outImageData.data[dstIdx + 1] = Math.round(Math.max(0, Math.min(255, (outData[height * width + idx] as number) * 255)));
      outImageData.data[dstIdx + 2] = Math.round(Math.max(0, Math.min(255, (outData[2 * height * width + idx] as number) * 255)));
      outImageData.data[dstIdx + 3] = 255;
    }
  }

  return outImageData;
}
