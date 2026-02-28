import type { ImageAdjustments } from "@/types";

export interface AutoEnhanceResult {
  adjustments: Partial<ImageAdjustments>;
  analysis: {
    avgLuminance: number;
    contrastRange: [number, number];
    colorTemp: number; // negative = cool, positive = warm
    saturationLevel: number;
  };
}

export function analyzeAndEnhance(imageData: ImageData): AutoEnhanceResult {
  const { data, width, height } = imageData;
  const pixelCount = width * height;

  // Build luminance histogram (256 bins)
  const histogram = new Uint32Array(256);
  let totalLuminance = 0;
  let totalR = 0, totalG = 0, totalB = 0;
  let totalSat = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const luminance = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
    histogram[luminance]++;
    totalLuminance += luminance;
    totalR += r;
    totalG += g;
    totalB += b;

    // Saturation via max-min channel difference
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    totalSat += max > 0 ? (max - min) / max : 0;
  }

  const avgLuminance = totalLuminance / pixelCount;
  const avgR = totalR / pixelCount;
  const avgG = totalG / pixelCount;
  const avgB = totalB / pixelCount;
  const avgSat = totalSat / pixelCount;

  // Find 5th and 95th percentile
  let cumulative = 0;
  let p5 = 0, p95 = 255;
  const threshold5 = pixelCount * 0.05;
  const threshold95 = pixelCount * 0.95;

  for (let i = 0; i < 256; i++) {
    cumulative += histogram[i];
    if (cumulative >= threshold5 && p5 === 0) p5 = i;
    if (cumulative >= threshold95) { p95 = i; break; }
  }

  // Color temperature: warm if red-heavy, cool if blue-heavy
  const colorTemp = ((avgR - avgB) / 255) * 100; // -100 to +100 range roughly

  // Calculate adjustments
  const adjustments: Partial<ImageAdjustments> = {};

  // Brightness: target average luminance ~128
  const brightnessDelta = ((128 - avgLuminance) / 128) * 50;
  if (Math.abs(brightnessDelta) > 5) {
    adjustments.brightness = Math.round(Math.max(-50, Math.min(50, brightnessDelta)));
  }

  // Contrast: wider range = less needed. Narrow range = boost
  const contrastRange = p95 - p5;
  if (contrastRange < 180) {
    adjustments.contrast = Math.round(Math.min(40, ((180 - contrastRange) / 180) * 40));
  }

  // Saturation: boost if undersaturated
  if (avgSat < 0.3) {
    adjustments.saturation = Math.round(Math.min(30, ((0.3 - avgSat) / 0.3) * 30));
  }

  // Exposure: fine-tune based on histogram shape
  if (avgLuminance < 80) {
    adjustments.exposure = Math.round(Math.min(30, ((80 - avgLuminance) / 80) * 30));
  } else if (avgLuminance > 180) {
    adjustments.exposure = Math.round(Math.max(-30, ((180 - avgLuminance) / 180) * 30));
  }

  return {
    adjustments,
    analysis: {
      avgLuminance,
      contrastRange: [p5, p95],
      colorTemp,
      saturationLevel: avgSat,
    },
  };
}
