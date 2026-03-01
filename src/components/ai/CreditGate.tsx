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
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <p className="text-sm text-amber-400 mb-2">
              クレジットが不足しています (必要: {creditsNeeded}cr)
            </p>
            <a href="/subscription" className="text-xs text-purple-400 hover:text-purple-300 underline">
              クレジットを購入
            </a>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}
