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
      { id: "inpaint", label: "塗りつぶし", icon: <PaintBucket size={14} />, credits: 5 },
      { id: "erase", label: "消しゴム", icon: <Eraser size={14} />, credits: 3 },
      { id: "style", label: "スタイル", icon: <Palette size={14} />, credits: 3 },
    ];
  }

  if (hasFaceDetected) {
    return [
      { id: "auto-enhance", label: "補正", icon: <Lightning size={14} />, credits: 0 },
      { id: "upscale-hd", label: "HD化", icon: <MagnifyingGlassPlus size={14} />, credits: 3 },
      { id: "bg-remove", label: "背景除去", icon: <Scissors size={14} />, credits: 2 },
    ];
  }

  return [
    { id: "auto-enhance", label: "補正", icon: <Lightning size={14} />, credits: 0 },
    { id: "bg-remove", label: "背景除去", icon: <Scissors size={14} />, credits: 2 },
    { id: "upscale-lite", label: "HD化", icon: <MagnifyingGlassPlus size={14} />, credits: 0 },
    { id: "style", label: "スタイル", icon: <Palette size={14} />, credits: 3 },
  ];
}

export function ContextTaskbar(props: ContextTaskbarProps) {
  const { aiStatus, aiProgress } = useAIStore();
  const actions = getContextActions(props);
  const isProcessing = aiStatus === "processing" || aiStatus === "loading-model";

  if (!props.hasImage) return null;

  return (
    <div className="inline-flex items-center gap-1 px-1.5 py-1 rounded-[var(--radius-md)]
      bg-black/60 backdrop-blur-sm border border-white/10">

      {isProcessing ? (
        <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs text-white/80">
          <SpinnerGap size={12} className="animate-spin" />
          <span className="max-w-[120px] truncate">{aiProgress}</span>
        </div>
      ) : (
        actions.map((action) => (
          <button
            key={action.id}
            onClick={() => props.onFeatureSelect(action.id)}
            title={`${action.label}${action.credits > 0 ? ` (${action.credits} クレジット)` : " (無料)"}`}
            className="flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)]
              hover:bg-white/15 text-white/80 hover:text-white
              text-xs transition-all duration-150"
          >
            {action.icon}
            <span className="hidden sm:inline">{action.label}</span>
            {action.credits > 0 ? (
              <span className="text-[10px] text-amber-400">{action.credits}</span>
            ) : (
              <span className="text-[10px] text-emerald-400">無料</span>
            )}
          </button>
        ))
      )}
    </div>
  );
}
