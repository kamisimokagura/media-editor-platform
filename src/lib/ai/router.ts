import type { AILayerType } from "@/types/ai";

interface AIFeatureConfig {
  type: AILayerType;
  credits: number;
  tier: "free" | "paid";
  provider: "canvas" | "onnx" | "api";
}

const FEATURE_CONFIG: Record<string, AIFeatureConfig> = {
  "auto-enhance":  { type: "auto-enhance",  credits: 0,  tier: "free", provider: "canvas" },
  "upscale-lite":  { type: "upscale",       credits: 0,  tier: "free", provider: "onnx" },
  "denoise":       { type: "denoise",       credits: 0,  tier: "free", provider: "onnx" },
  "face-detect":   { type: "face-detect",   credits: 0,  tier: "free", provider: "onnx" },
  "smart-crop":    { type: "smart-crop",    credits: 0,  tier: "free", provider: "onnx" },
  "bg-remove":     { type: "bg-remove",     credits: 2,  tier: "paid", provider: "api" },
  "upscale-hd":    { type: "upscale-hd",    credits: 3,  tier: "paid", provider: "api" },
  "inpaint":       { type: "inpaint",       credits: 5,  tier: "paid", provider: "api" },
  "erase":         { type: "erase",         credits: 3,  tier: "paid", provider: "api" },
  "expand":        { type: "expand",        credits: 4,  tier: "paid", provider: "api" },
  "style":         { type: "style",         credits: 3,  tier: "paid", provider: "api" },
};

export function getFeatureConfig(featureId: string): AIFeatureConfig | null {
  return FEATURE_CONFIG[featureId] ?? null;
}

export function isFreeFeature(featureId: string): boolean {
  return FEATURE_CONFIG[featureId]?.tier === "free";
}

export function getCreditsNeeded(featureId: string): number {
  return FEATURE_CONFIG[featureId]?.credits ?? 0;
}

export { FEATURE_CONFIG };
export type { AIFeatureConfig };
