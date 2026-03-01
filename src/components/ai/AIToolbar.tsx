"use client";

import React from "react";
import { FEATURE_CONFIG } from "@/lib/ai/router";
import { useAIStore } from "@/stores/aiStore";

const FREE_FEATURES = Object.entries(FEATURE_CONFIG).filter(([, c]) => c.tier === "free");
const PAID_FEATURES = Object.entries(FEATURE_CONFIG).filter(([, c]) => c.tier === "paid");

interface AIToolbarProps {
  onFeatureSelect: (featureId: string) => void;
  disabled?: boolean;
}

export function AIToolbar({ onFeatureSelect, disabled }: AIToolbarProps) {
  const { aiStatus } = useAIStore();
  const isProcessing = aiStatus === "processing" || aiStatus === "loading-model";

  return (
    <div className="flex flex-col gap-4 p-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-white/80 uppercase tracking-wider">AI Tools</h3>

      {/* Free Features */}
      <div className="space-y-1">
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-2">Free</p>
        {FREE_FEATURES.map(([id]) => (
          <button
            key={id}
            onClick={() => onFeatureSelect(id)}
            disabled={disabled || isProcessing}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg
              bg-gray-100 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300
              dark:bg-white/5 dark:hover:bg-emerald-500/10 dark:border-white/5 dark:hover:border-emerald-500/30
              text-sm text-gray-800 dark:text-white/90 transition-all duration-200
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="capitalize">{id.replace(/-/g, " ")}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">FREE</span>
          </button>
        ))}
      </div>

      {/* Paid Features */}
      <div className="space-y-1">
        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-2">Pro</p>
        {PAID_FEATURES.map(([id, config]) => (
          <button
            key={id}
            onClick={() => onFeatureSelect(id)}
            disabled={disabled || isProcessing}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg
              bg-gray-100 hover:bg-amber-50 border border-gray-200 hover:border-amber-300
              dark:bg-white/5 dark:hover:bg-amber-500/10 dark:border-white/5 dark:hover:border-amber-500/30
              text-sm text-gray-800 dark:text-white/90 transition-all duration-200
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="capitalize">{id.replace(/-/g, " ")}</span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{config.credits}cr</span>
          </button>
        ))}
      </div>
    </div>
  );
}
