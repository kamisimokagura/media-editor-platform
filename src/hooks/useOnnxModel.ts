import { useState, useCallback } from "react";
import { useAIStore } from "@/stores/aiStore";
import { createInferenceSession } from "@/lib/ai/models/model-manager";
import type { InferenceSession } from "onnxruntime-web";

export function useOnnxModel(modelName: string) {
  const { loadedModels, markModelLoaded, setAIStatus } = useAIStore();
  const [session, setSession] = useState<InferenceSession | null>(null);
  const [progress, setProgress] = useState(0);
  const isLoaded = loadedModels.has(modelName);

  const load = useCallback(async () => {
    if (session) return session;

    setAIStatus("loading-model", `${modelName} をロード中...`);

    try {
      const sess = await createInferenceSession(modelName, (loaded, total) => {
        setProgress(Math.round((loaded / total) * 100));
      });
      setSession(sess);
      markModelLoaded(modelName);
      setAIStatus("idle");
      return sess;
    } catch (err) {
      setAIStatus("error", `${modelName} のロードに失敗しました`);
      throw err;
    }
  }, [modelName, session, setAIStatus, markModelLoaded]);

  return { session, isLoaded, progress, load };
}
