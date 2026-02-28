"use client";

import React from "react";
import { useAILayers } from "@/hooks/useAILayers";

interface AIResultLayerProps {
  onApply?: (layerId: string) => void;
  onDiscard?: (layerId: string) => void;
}

export function AIResultLayer({ onApply, onDiscard }: AIResultLayerProps) {
  const { layers, toggleLayerVisibility, removeLayer } = useAILayers();

  if (layers.length === 0) return null;

  return (
    <div className="absolute bottom-14 left-3 right-3 max-h-48 overflow-y-auto
      bg-black/60 backdrop-blur-xl rounded-xl border border-white/10 p-2 space-y-1">
      <p className="text-xs text-white/50 px-2 py-1 uppercase tracking-wider">AI Layers</p>
      {layers.map((layer) => (
        <div
          key={layer.id}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg
            bg-white/5 hover:bg-white/10 transition-colors"
        >
          <button
            onClick={() => toggleLayerVisibility(layer.id)}
            className={`w-4 h-4 rounded border ${
              layer.visible ? "bg-purple-500 border-purple-400" : "bg-transparent border-white/30"
            }`}
          />
          <span className="flex-1 text-sm text-white/80 capitalize truncate">
            {layer.label.replace(/-/g, " ")}
          </span>
          {layer.credits ? (
            <span className="text-xs text-amber-400">{layer.credits}cr</span>
          ) : null}
          <div className="flex gap-1">
            {onApply && (
              <button
                onClick={() => onApply(layer.id)}
                className="px-2 py-0.5 text-xs rounded bg-emerald-500/20 text-emerald-400
                  hover:bg-emerald-500/30 transition-colors"
              >
                Apply
              </button>
            )}
            {onDiscard && (
              <button
                onClick={() => { onDiscard(layer.id); removeLayer(layer.id); }}
                className="px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-400
                  hover:bg-red-500/30 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
