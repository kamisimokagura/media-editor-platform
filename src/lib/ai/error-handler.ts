import { toast } from "@/stores/toastStore";

export type AIErrorType =
  | "credits_insufficient"
  | "onnx_load_failed"
  | "api_timeout"
  | "api_error"
  | "quota_exceeded"
  | "offline"
  | "unknown";

interface AIError {
  type: AIErrorType;
  message: string;
  retryable: boolean;
}

export function classifyError(error: unknown): AIError {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (msg.includes("credit") || msg.includes("クレジット")) {
      return { type: "credits_insufficient", message: "クレジットが不足しています", retryable: false };
    }
    if (msg.includes("onnx") || msg.includes("model") || msg.includes("inference")) {
      return { type: "onnx_load_failed", message: "AIモデルの読み込みに失敗しました", retryable: true };
    }
    if (msg.includes("timeout") || msg.includes("timed out")) {
      return { type: "api_timeout", message: "リクエストがタイムアウトしました", retryable: true };
    }
    if (msg.includes("quota") || msg.includes("rate limit") || msg.includes("429")) {
      return { type: "quota_exceeded", message: "APIの利用制限に達しました", retryable: false };
    }
    if (msg.includes("network") || msg.includes("fetch") || msg.includes("offline")) {
      return { type: "offline", message: "ネットワーク接続を確認してください", retryable: true };
    }

    return { type: "api_error", message: error.message, retryable: true };
  }

  return { type: "unknown", message: "不明なエラーが発生しました", retryable: false };
}

export function handleAIError(error: unknown): AIError {
  const classified = classifyError(error);

  switch (classified.type) {
    case "credits_insufficient":
      toast.error(`${classified.message}。プランをアップグレードしてください。`);
      break;
    case "onnx_load_failed":
      toast.error(`${classified.message}。再試行してください。`);
      break;
    case "api_timeout":
      toast.warning(`${classified.message}。別のモデルを試してみてください。`);
      break;
    case "quota_exceeded":
      toast.warning(`${classified.message}。しばらくしてから再試行してください。`);
      break;
    case "offline":
      toast.error(`${classified.message}。無料のブラウザAI機能はオフラインでも使えます。`);
      break;
    default:
      toast.error(classified.message);
  }

  return classified;
}
