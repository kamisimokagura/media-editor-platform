export type AILayerType =
  | "auto-enhance" | "upscale" | "denoise" | "face-detect" | "smart-crop"
  | "bg-remove" | "upscale-hd" | "inpaint" | "erase" | "expand" | "style"
  | "generate";

export interface AILayer {
  id: string;
  type: AILayerType;
  label: string;
  imageData: ImageData | null;
  imageUrl: string | null;
  visible: boolean;
  createdAt: number;
  model?: string;
  credits?: number;
}

export interface AIModelOption {
  id: string;
  name: string;
  provider: string;
  credits: number;
  tags: string[];
  description: string;
}

export interface AIChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AIChatAction[];
  timestamp: number;
}

export interface AIChatAction {
  label: string;
  type: "adjust" | "filter" | "ai_tool";
  params: Record<string, unknown>;
  credits: number;
}

export type LLMProvider = "gemini" | "claude" | "grok";

export interface OnnxModelInfo {
  name: string;
  url: string;
  sizeBytes: number;
  version: string;
}

export type AIProcessingStatus = "idle" | "loading-model" | "processing" | "complete" | "error";
