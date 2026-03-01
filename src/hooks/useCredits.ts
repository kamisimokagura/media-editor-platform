import { useCallback } from "react";
import { useAIStore } from "@/stores/aiStore";

export function useCredits() {
  const { creditsRemaining, setCreditsRemaining } = useAIStore();

  const checkCredits = useCallback(async (needed: number): Promise<boolean> => {
    if (needed <= 0) return true;
    if (creditsRemaining < needed) return false;
    const res = await fetch("/api/ai/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check", operation: "credit_check", credits_needed: needed }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setCreditsRemaining(data.credits_remaining);
    return data.allowed;
  }, [creditsRemaining, setCreditsRemaining]);

  const consumeCredits = useCallback(async (amount: number, operation: string): Promise<boolean> => {
    if (amount <= 0) return true;
    const res = await fetch("/api/ai/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "consume", operation, credits_consumed: amount }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setCreditsRemaining(data.credits_remaining);
    return data.success;
  }, [setCreditsRemaining]);

  const refreshCredits = useCallback(async () => {
    const res = await fetch("/api/ai/usage");
    if (res.ok) {
      const data = await res.json();
      setCreditsRemaining(data.credits_remaining ?? 0);
    }
  }, [setCreditsRemaining]);

  return { creditsRemaining, checkCredits, consumeCredits, refreshCredits };
}
