"use client";

import React from "react";
import { useCredits } from "@/hooks/useCredits";

interface CreditGateProps {
  creditsNeeded: number;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function CreditGate({ creditsNeeded, children, fallback }: CreditGateProps) {
  const { creditsRemaining } = useCredits();

  if (creditsNeeded <= 0) return <>{children}</>;

  if (creditsRemaining < creditsNeeded) {
    return (
      <>
        {fallback ?? (
          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-warning-soft)] border border-[var(--color-warning)] text-center">
            <p className="text-sm text-[var(--color-warning)] mb-2">
              クレジットが不足しています (必要: {creditsNeeded}cr)
            </p>
            <a href="/subscription" className="text-xs text-[var(--color-accent-text)] hover:text-[var(--color-accent)] underline">
              クレジットを購入
            </a>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}
