"use client";

import { useCallback } from "react";
import { useAIStore } from "@/stores/aiStore";
import type { AILayer } from "@/types/ai";

export function useAILayers() {
  const { layers, removeLayer, toggleLayerVisibility, clearLayers } = useAIStore();

  const getVisibleLayers = useCallback((): AILayer[] => {
    return layers.filter((l) => l.visible);
  }, [layers]);

  const getLatestLayer = useCallback((): AILayer | null => {
    return layers.length > 0 ? layers[layers.length - 1] : null;
  }, [layers]);

  return {
    layers,
    visibleLayers: getVisibleLayers(),
    latestLayer: getLatestLayer(),
    removeLayer,
    toggleLayerVisibility,
    clearLayers,
  };
}
