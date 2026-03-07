"use client";

import React from "react";
import type { ReactNode } from "react";
import { Lightning, MagnifyingGlassPlus, Scissors, Palette, Sparkle, ImageSquare } from "@phosphor-icons/react";
import type { AILayerType } from "@/types/ai";

interface ToolChainProps {
  lastActionType: AILayerType | null;
  onFeatureSelect: (featureId: string) => void;
}

interface ChainSuggestion {
  id: string;
  label: string;
  icon: ReactNode;
}

const CHAIN_MAP: Partial<Record<AILayerType, ChainSuggestion[]>> = {
  "bg-remove": [
    { id: "expand", label: "New Background", icon: <ImageSquare size={14} /> },
    { id: "upscale-hd", label: "Upscale", icon: <MagnifyingGlassPlus size={14} /> },
  ],
  "upscale": [
    { id: "denoise", label: "Denoise", icon: <Sparkle size={14} /> },
    { id: "auto-enhance", label: "Auto Enhance", icon: <Lightning size={14} /> },
  ],
  "upscale-hd": [
    { id: "denoise", label: "Denoise", icon: <Sparkle size={14} /> },
    { id: "auto-enhance", label: "Auto Enhance", icon: <Lightning size={14} /> },
  ],
  "generate": [
    { id: "upscale-hd", label: "Upscale", icon: <MagnifyingGlassPlus size={14} /> },
    { id: "style", label: "Style Transfer", icon: <Palette size={14} /> },
  ],
  "auto-enhance": [
    { id: "upscale-lite", label: "Upscale", icon: <MagnifyingGlassPlus size={14} /> },
    { id: "bg-remove", label: "Remove BG", icon: <Scissors size={14} /> },
  ],
  "style": [
    { id: "upscale-hd", label: "Upscale", icon: <MagnifyingGlassPlus size={14} /> },
    { id: "auto-enhance", label: "Enhance", icon: <Lightning size={14} /> },
  ],
  "denoise": [
    { id: "auto-enhance", label: "Enhance", icon: <Lightning size={14} /> },
    { id: "upscale-lite", label: "Upscale", icon: <MagnifyingGlassPlus size={14} /> },
  ],
  "inpaint": [
    { id: "auto-enhance", label: "Enhance", icon: <Lightning size={14} /> },
    { id: "upscale-hd", label: "Upscale", icon: <MagnifyingGlassPlus size={14} /> },
  ],
};

export function ToolChain({ lastActionType, onFeatureSelect }: ToolChainProps) {
  if (!lastActionType) return null;

  const suggestions = CHAIN_MAP[lastActionType];
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)]
      bg-[var(--color-accent-soft)] border border-[var(--color-accent)]">
      <span className="text-xs text-[var(--color-accent-text)]">Next:</span>
      {suggestions.map((s) => (
        <button
          key={s.id}
          onClick={() => onFeatureSelect(s.id)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-sm)]
            bg-[var(--color-bg)] hover:bg-[var(--color-accent-soft)] border border-[var(--color-border)] hover:border-[var(--color-accent)]
            text-xs text-[var(--color-text)] transition-all duration-[var(--transition-base)]
            hover:scale-105 active:scale-95"
        >
          {s.icon}
          <span>{s.label}</span>
        </button>
      ))}
    </div>
  );
}
