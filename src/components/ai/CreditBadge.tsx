"use client";

import React, { useState, useEffect } from "react";
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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
          bg-white/5 hover:bg-white/10 border border-white/10
          text-sm transition-all duration-200"
      >
        <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6c.304 0 .792.193 1.264.979a1 1 0 001.715-1.029C12.279 4.784 11.232 4 10 4s-2.279.784-2.979 1.95c-.285.475-.507 1-.67 1.55H6a1 1 0 000 2h.013a9.358 9.358 0 000 1H6a1 1 0 100 2h.351c.163.55.385 1.075.67 1.55C7.721 15.216 8.768 16 10 16s2.279-.784 2.979-1.95a1 1 0 10-1.715-1.029C10.792 13.807 10.304 14 10 14c-.304 0-.792-.193-1.264-.979a5.38 5.38 0 01-.491-1.021H10a1 1 0 100-2H8.003a7.364 7.364 0 010-1H10a1 1 0 100-2H8.245c.155-.362.342-.7.491-1.021z" />
        </svg>
        <span className="text-white/90 font-medium">{creditsRemaining}</span>
        <span className="text-white/50 text-xs">cr</span>
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 top-full mt-2 w-56 p-3 rounded-xl z-50
            bg-dark-900/95 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="text-sm text-white/70 mb-3">
              <p className="text-white font-medium mb-1">AI Credits</p>
              <p>残り: <span className="text-amber-400 font-bold">{creditsRemaining}</span> クレジット</p>
            </div>
            <div className="space-y-2">
              <a href="/subscription" className="block w-full px-3 py-2 text-sm text-center rounded-lg
                bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 transition-colors">
                Top Up
              </a>
              <a href="/subscription" className="block w-full px-3 py-2 text-sm text-center rounded-lg
                bg-white/5 hover:bg-white/10 text-white/70 transition-colors">
                Manage Plan
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
