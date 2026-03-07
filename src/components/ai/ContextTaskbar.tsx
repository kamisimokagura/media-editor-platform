"use client";

import React, { type ReactNode } from "react";
import { Lightning, MagnifyingGlassPlus, Scissors, Palette, Eraser, PaintBucket, SpinnerGap } from "@phosphor-icons/react";
import { useAIStore } from "@/stores/aiStore";

interface ContextTaskbarProps {
  hasImage: boolean;
  hasFaceDetected?: boolean;
  hasBrushSelection?: boolean;
  onFeatureSelect: (featureId: string) => void;
}

interface QuickAction {
  id: string;
  label: string;
  icon: ReactNode;
  credits: number;
}

function getContextActions(props: ContextTaskbarProps): QuickAction[] {
  const { hasImage, hasFaceDetected, hasBrushSelection } = props;

  if (!hasImage) return [];

  if (hasBrushSelection) {
    return [
      { id: "inpaint", label: "Fill", icon: <PaintBucket size={16} />, credits: 5 },
      { id: "erase", label: "Erase", icon: <Eraser size={16} />, credits: 3 },
      { id: "style", label: "Style", icon: <Palette size={16} />, credits: 3 },
    ];
  }

  if (hasFaceDetected) {
    return [
      { id: "auto-enhance", label: "Enhance", icon: <Lightning size={16} />, credits: 0 },
      { id: "upscale-hd", label: "Upscale", icon: <MagnifyingGlassPlus size={16} />, credits: 3 },
      { id: "bg-remove", label: "Remove BG", icon: <Scissors size={16} />, credits: 2 },
    ];
  }

  return [
    { id: "auto-enhance", label: "Auto Enhance", icon: <Lightning size={16} />, credits: 0 },
    { id: "bg-remove", label: "Remove BG", icon: <Scissors size={16} />, credits: 2 },
    { id: "upscale-lite", label: "Upscale", icon: <MagnifyingGlassPlus size={16} />, credits: 0 },
    { id: "style", label: "Style", icon: <Palette size={16} />, credits: 3 },
  ];
}

export function ContextTaskbar(props: ContextTaskbarProps) {
  const { aiStatus, aiProgress } = useAIStore();
  const actions = getContextActions(props);
  const isProcessing = aiStatus === "processing" || aiStatus === "loading-model";

  if (!props.hasImage) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)]
      bg-[var(--color-surface)] border border-[var(--color-border)]
      shadow-[var(--shadow-md)]">

      {isProcessing ? (
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <SpinnerGap size={16} className="animate-spin text-[var(--color-accent)]" />
          <span>{aiProgress}</span>
        </div>
      ) : (
        actions.map((action) => (
          <button
            key={action.id}
            onClick={() => props.onFeatureSelect(action.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)]
              bg-[var(--color-bg)] hover:bg-[var(--color-accent-soft)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)]
              text-sm text-[var(--color-text)] transition-all duration-[var(--transition-base)]
              hover:scale-105 active:scale-95"
          >
            <span>{action.icon}</span>
            <span>{action.label}</span>
            {action.credits > 0 && (
              <span className="text-xs text-[var(--color-warning)] ml-1">{action.credits}cr</span>
            )}
          </button>
        ))
      )}
    </div>
  );
}
