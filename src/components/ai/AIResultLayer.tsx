"use client";

import React from "react";
import { X } from "@phosphor-icons/react";
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
      bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-lg)] p-2 space-y-1">
      <p className="text-xs text-[var(--color-text-muted)] px-2 py-1 uppercase tracking-wider">AI Layers</p>
      {layers.map((layer) => (
        <div
          key={layer.id}
          className="flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-md)]
            bg-[var(--color-bg)] hover:bg-[var(--color-accent-soft)] transition-colors duration-[var(--transition-fast)]"
        >
          <button
            onClick={() => toggleLayerVisibility(layer.id)}
            className={`w-4 h-4 rounded border ${
              layer.visible ? "bg-[var(--color-accent)] border-[var(--color-accent)]" : "bg-transparent border-[var(--color-border)]"
            }`}
          />
          <span className="flex-1 text-sm text-[var(--color-text)] capitalize truncate">
            {layer.label.replace(/-/g, " ")}
          </span>
          {layer.credits ? (
            <span className="text-xs text-[var(--color-warning)]">{layer.credits}cr</span>
          ) : null}
          <div className="flex gap-1">
            {onApply && (
              <button
                onClick={() => onApply(layer.id)}
                className="px-2 py-0.5 text-xs rounded-[var(--radius-sm)] bg-[var(--color-success-soft)] text-[var(--color-success)]
                  hover:bg-[var(--color-success)] hover:text-[var(--color-text-inverse)] transition-colors duration-[var(--transition-fast)]"
              >
                Apply
              </button>
            )}
            {onDiscard && (
              <button
                onClick={() => { onDiscard(layer.id); removeLayer(layer.id); }}
                className="px-2 py-0.5 text-xs rounded-[var(--radius-sm)] bg-[var(--color-error-soft)] text-[var(--color-error)]
                  hover:bg-[var(--color-error)] hover:text-[var(--color-text-inverse)] transition-colors duration-[var(--transition-fast)]"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
