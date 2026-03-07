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
      <h3 className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wider">AI Tools</h3>

      {/* Free Features */}
      <div className="space-y-1">
        <p className="text-xs text-[var(--color-success)] font-medium mb-2">Free</p>
        {FREE_FEATURES.map(([id]) => (
          <button
            key={id}
            onClick={() => onFeatureSelect(id)}
            disabled={disabled || isProcessing}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg
              bg-[var(--color-bg)] hover:bg-[var(--color-success-soft)] border border-[var(--color-border)] hover:border-[var(--color-success)]
              text-sm text-[var(--color-text)] transition-all duration-[var(--transition-base)]
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="capitalize">{id.replace(/-/g, " ")}</span>
            <span className="text-xs text-[var(--color-success)] font-medium">FREE</span>
          </button>
        ))}
      </div>

      {/* Paid Features */}
      <div className="space-y-1">
        <p className="text-xs text-[var(--color-warning)] font-medium mb-2">Pro</p>
        {PAID_FEATURES.map(([id, config]) => (
          <button
            key={id}
            onClick={() => onFeatureSelect(id)}
            disabled={disabled || isProcessing}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg
              bg-[var(--color-bg)] hover:bg-[var(--color-warning-soft)] border border-[var(--color-border)] hover:border-[var(--color-warning)]
              text-sm text-[var(--color-text)] transition-all duration-[var(--transition-base)]
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="capitalize">{id.replace(/-/g, " ")}</span>
            <span className="text-xs text-[var(--color-warning)] font-medium">{config.credits}cr</span>
          </button>
        ))}
      </div>
    </div>
  );
}
