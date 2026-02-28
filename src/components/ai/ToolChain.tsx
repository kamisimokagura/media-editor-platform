"use client";

import React from "react";
import type { AILayerType } from "@/types/ai";

interface ToolChainProps {
  lastActionType: AILayerType | null;
  onFeatureSelect: (featureId: string) => void;
}

interface ChainSuggestion {
  id: string;
  label: string;
  icon: string;
}

const CHAIN_MAP: Partial<Record<AILayerType, ChainSuggestion[]>> = {
  "bg-remove": [
    { id: "expand", label: "New Background", icon: "🖼️" },
    { id: "upscale-hd", label: "Upscale", icon: "🔍" },
  ],
  "upscale": [
    { id: "denoise", label: "Denoise", icon: "✨" },
    { id: "auto-enhance", label: "Auto Enhance", icon: "⚡" },
  ],
  "upscale-hd": [
    { id: "denoise", label: "Denoise", icon: "✨" },
    { id: "auto-enhance", label: "Auto Enhance", icon: "⚡" },
  ],
  "generate": [
    { id: "upscale-hd", label: "Upscale", icon: "🔍" },
    { id: "style", label: "Style Transfer", icon: "🎨" },
  ],
  "auto-enhance": [
    { id: "upscale-lite", label: "Upscale", icon: "🔍" },
    { id: "bg-remove", label: "Remove BG", icon: "✂️" },
  ],
  "style": [
    { id: "upscale-hd", label: "Upscale", icon: "🔍" },
    { id: "auto-enhance", label: "Enhance", icon: "⚡" },
  ],
  "denoise": [
    { id: "auto-enhance", label: "Enhance", icon: "⚡" },
    { id: "upscale-lite", label: "Upscale", icon: "🔍" },
  ],
  "inpaint": [
    { id: "auto-enhance", label: "Enhance", icon: "⚡" },
    { id: "upscale-hd", label: "Upscale", icon: "🔍" },
  ],
};

export function ToolChain({ lastActionType, onFeatureSelect }: ToolChainProps) {
  if (!lastActionType) return null;

  const suggestions = CHAIN_MAP[lastActionType];
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg
      bg-purple-500/10 border border-purple-500/20">
      <span className="text-xs text-purple-300">Next:</span>
      {suggestions.map((s) => (
        <button
          key={s.id}
          onClick={() => onFeatureSelect(s.id)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md
            bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/30
            text-xs text-white/80 transition-all duration-200
            hover:scale-105 active:scale-95"
        >
          <span>{s.icon}</span>
          <span>{s.label}</span>
        </button>
      ))}
    </div>
  );
}
