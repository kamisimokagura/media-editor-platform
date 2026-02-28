export interface BgRemoveLiteOptions {
  threshold?: number;   // Color distance threshold (default: 30)
  edgeSamples?: number; // Number of edge pixel samples (default: 50)
  feather?: number;     // Edge feathering pixels (default: 2)
}

export function removeBgLite(
  imageData: ImageData,
  options: BgRemoveLiteOptions = {}
): ImageData {
  const { threshold = 30, edgeSamples = 50, feather = 2 } = options;
  const { data, width, height } = imageData;
  const result = new ImageData(new Uint8ClampedArray(data), width, height);

  // Sample edge pixels to determine background color
  const edgeColors: [number, number, number][] = [];

  // Sample from all 4 edges
  for (let i = 0; i < edgeSamples; i++) {
    // Top edge
    const tx = Math.floor((i / edgeSamples) * width);
    const ti = (tx) * 4;
    edgeColors.push([data[ti], data[ti + 1], data[ti + 2]]);

    // Bottom edge
    const bx = Math.floor((i / edgeSamples) * width);
    const bi = ((height - 1) * width + bx) * 4;
    edgeColors.push([data[bi], data[bi + 1], data[bi + 2]]);

    // Left edge
    const ly = Math.floor((i / edgeSamples) * height);
    const li = (ly * width) * 4;
    edgeColors.push([data[li], data[li + 1], data[li + 2]]);

    // Right edge
    const ry = Math.floor((i / edgeSamples) * height);
    const ri = (ry * width + width - 1) * 4;
    edgeColors.push([data[ri], data[ri + 1], data[ri + 2]]);
  }

  // Average edge color = estimated background
  const bgR = edgeColors.reduce((s, c) => s + c[0], 0) / edgeColors.length;
  const bgG = edgeColors.reduce((s, c) => s + c[1], 0) / edgeColors.length;
  const bgB = edgeColors.reduce((s, c) => s + c[2], 0) / edgeColors.length;

  // Remove pixels close to background color
  for (let i = 0; i < result.data.length; i += 4) {
    const r = result.data[i];
    const g = result.data[i + 1];
    const b = result.data[i + 2];

    const distance = Math.sqrt(
      (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2
    );

    if (distance < threshold) {
      result.data[i + 3] = 0; // Fully transparent
    } else if (distance < threshold + feather * 10) {
      // Feathered edge
      const alpha = Math.round(((distance - threshold) / (feather * 10)) * 255);
      result.data[i + 3] = Math.min(result.data[i + 3], alpha);
    }
  }

  return result;
}
