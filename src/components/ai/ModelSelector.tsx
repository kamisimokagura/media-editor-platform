"use client";

import React from "react";
import type { AIModelOption } from "@/types/ai";

interface ModelSelectorProps {
  models: AIModelOption[];
  selected: string;
  onSelect: (modelId: string) => void;
}

export function ModelSelector({ models, selected, onSelect }: ModelSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {models.map((model) => (
        <button
          key={model.id}
          onClick={() => onSelect(model.id)}
          className={`p-3 rounded-[var(--radius-lg)] text-left transition-all duration-[var(--transition-base)] border ${
            selected === model.id
              ? "bg-[var(--color-accent-soft)] border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]"
              : "bg-[var(--color-bg)] border-[var(--color-border)] hover:bg-[var(--color-accent-soft)] hover:border-[var(--color-border-hover)]"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-[var(--color-text)]">{model.name}</span>
            <span className="text-xs text-[var(--color-warning)]">{model.credits} クレジット</span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">{model.description}</p>
          <div className="flex gap-1 mt-2">
            {model.tags.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 text-[10px] rounded-[var(--radius-full)]
                bg-[var(--color-accent-soft)] text-[var(--color-text-muted)]">{tag}</span>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
