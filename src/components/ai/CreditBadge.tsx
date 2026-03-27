"use client";

import React, { useState, useEffect } from "react";
import { Coins } from "@phosphor-icons/react";
import { useCredits } from "@/hooks/useCredits";

export function CreditBadge() {
  const { creditsRemaining, refreshCredits } = useCredits();
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)]
          bg-[var(--color-bg)] hover:bg-[var(--color-accent-soft)] border border-[var(--color-border)]
          text-sm transition-all duration-[var(--transition-base)]"
      >
        <Coins size={16} weight="fill" className="text-[var(--color-warning)]" />
        <span className="text-[var(--color-text)] font-medium">{creditsRemaining.toLocaleString()}</span>
        <span className="text-[var(--color-text-muted)] text-xs">クレジット</span>
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 top-full mt-2 w-56 p-3 rounded-[var(--radius-lg)] z-50
            bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-lg)]">
            <div className="text-sm text-[var(--color-text-muted)] mb-3">
              <p className="text-[var(--color-text)] font-medium mb-1">AI クレジット</p>
              <p>残り: <span className="text-[var(--color-warning)] font-bold">{creditsRemaining.toLocaleString()}</span> クレジット</p>
            </div>
            <div className="space-y-2">
              <a href="/subscription" className="block w-full px-3 py-2 text-sm text-center rounded-[var(--radius-md)]
                bg-[var(--color-accent-soft)] hover:bg-[var(--color-accent)] text-[var(--color-accent-text)] hover:text-[var(--color-text-inverse)] transition-colors">
                クレジットを追加
              </a>
              <a href="/subscription" className="block w-full px-3 py-2 text-sm text-center rounded-[var(--radius-md)]
                bg-[var(--color-bg)] hover:bg-[var(--color-accent-soft)] text-[var(--color-text-muted)] transition-colors">
                プランを管理
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
