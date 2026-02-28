import { useCallback } from "react";
import { useAIStore } from "@/stores/aiStore";
import { useCredits } from "./useCredits";
import { getFeatureConfig, isFreeFeature } from "@/lib/ai/router";
import { toast } from "@/stores/toastStore";
import { v4 as uuidv4 } from "uuid";
import type { AILayer } from "@/types/ai";

export function useAIFeature() {
  const { addLayer, setAIStatus } = useAIStore();
  const { checkCredits, consumeCredits } = useCredits();

  const executeFeature = useCallback(
    async (
      featureId: string,
      processFn: () => Promise<{ imageData?: ImageData; imageUrl?: string } | null>,
      options?: { model?: string }
    ) => {
      const config = getFeatureConfig(featureId);
      if (!config) {
        toast.error("不明なAI機能です");
        return null;
      }

      if (!isFreeFeature(featureId)) {
        const hasCredits = await checkCredits(config.credits);
        if (!hasCredits) {
          toast.error(`クレジットが不足しています (必要: ${config.credits}cr)`);
          return null;
        }
      }

      setAIStatus("processing", `${featureId} を処理中...`);

      try {
        const result = await processFn();
        if (!result) {
          setAIStatus("error", "処理に失敗しました");
          return null;
        }

        if (!isFreeFeature(featureId)) {
          await consumeCredits(config.credits, featureId);
        }

        const layer: AILayer = {
          id: uuidv4(),
          type: config.type,
          label: featureId,
          imageData: result.imageData ?? null,
          imageUrl: result.imageUrl ?? null,
          visible: true,
          createdAt: Date.now(),
          model: options?.model,
          credits: config.credits,
        };

        addLayer(layer);
        setAIStatus("complete", "完了！");
        toast.success(`${featureId} が完了しました`);
        return layer;
      } catch (err) {
        setAIStatus("error", "エラーが発生しました");
        toast.error(err instanceof Error ? err.message : "AI処理に失敗しました");
        return null;
      }
    },
    [addLayer, setAIStatus, checkCredits, consumeCredits]
  );

  return { executeFeature };
}
