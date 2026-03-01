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
          className={`p-3 rounded-xl text-left transition-all duration-200 border ${
            selected === model.id
              ? "bg-purple-500/20 border-purple-500/50 ring-1 ring-purple-500/30"
              : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-white/90">{model.name}</span>
            <span className="text-xs text-amber-400">{model.credits}cr</span>
          </div>
          <p className="text-xs text-white/50 line-clamp-2">{model.description}</p>
          <div className="flex gap-1 mt-2">
            {model.tags.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 text-[10px] rounded-full
                bg-white/5 text-white/40">{tag}</span>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
