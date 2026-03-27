"use client";

import React from "react";
import { useCredits } from "@/hooks/useCredits";

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_BILLING === "true" && process.env.NODE_ENV === "development";

interface CreditGateProps {
  creditsNeeded: number;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function CreditGate({ creditsNeeded, children, fallback }: CreditGateProps) {
  const { creditsRemaining } = useCredits();

  if (DEV_BYPASS || creditsNeeded <= 0) return <>{children}</>;

  if (creditsRemaining < creditsNeeded) {
    return (
      <>
        {fallback ?? (
          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-warning-soft)] border border-[var(--color-warning)] text-center">
            <p className="text-sm text-[var(--color-warning)] mb-2">
              クレジットが不足しています（必要: {creditsNeeded} クレジット）
            </p>
            <a href="/subscription" className="text-xs text-[var(--color-accent-text)] hover:text-[var(--color-accent)] underline">
              クレジットを追加する
            </a>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}
