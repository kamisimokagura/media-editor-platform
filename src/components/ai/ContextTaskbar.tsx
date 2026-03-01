"use client";

import React from "react";
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
  icon: string;
  credits: number;
}

function getContextActions(props: ContextTaskbarProps): QuickAction[] {
  const { hasImage, hasFaceDetected, hasBrushSelection } = props;

  if (!hasImage) return [];

  if (hasBrushSelection) {
    return [
      { id: "inpaint", label: "Fill", icon: "✨", credits: 5 },
      { id: "erase", label: "Erase", icon: "🧹", credits: 3 },
      { id: "style", label: "Style", icon: "🎨", credits: 3 },
    ];
  }

  if (hasFaceDetected) {
    return [
      { id: "auto-enhance", label: "Enhance", icon: "⚡", credits: 0 },
      { id: "upscale-hd", label: "Upscale", icon: "🔍", credits: 3 },
      { id: "bg-remove", label: "Remove BG", icon: "✂️", credits: 2 },
    ];
  }

  return [
    { id: "auto-enhance", label: "Auto Enhance", icon: "⚡", credits: 0 },
    { id: "bg-remove", label: "Remove BG", icon: "✂️", credits: 2 },
    { id: "upscale-lite", label: "Upscale", icon: "🔍", credits: 0 },
    { id: "style", label: "Style", icon: "🎨", credits: 3 },
  ];
}

export function ContextTaskbar(props: ContextTaskbarProps) {
  const { aiStatus, aiProgress } = useAIStore();
  const actions = getContextActions(props);
  const isProcessing = aiStatus === "processing" || aiStatus === "loading-model";

  if (!props.hasImage) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-xl
      bg-black/40 backdrop-blur-xl border border-white/10
      shadow-lg shadow-black/20">

      {isProcessing ? (
        <div className="flex items-center gap-2 text-sm text-white/70">
          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          <span>{aiProgress}</span>
        </div>
      ) : (
        actions.map((action) => (
          <button
            key={action.id}
            onClick={() => props.onFeatureSelect(action.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20
              text-sm text-white/90 transition-all duration-200
              hover:scale-105 active:scale-95"
          >
            <span>{action.icon}</span>
            <span>{action.label}</span>
            {action.credits > 0 && (
              <span className="text-xs text-amber-400 ml-1">{action.credits}cr</span>
            )}
          </button>
        ))
      )}
    </div>
  );
}
