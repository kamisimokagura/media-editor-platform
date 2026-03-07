"use client";

import React, { useState, useCallback } from "react";
import { Image as ImageIcon } from "@phosphor-icons/react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAIStore } from "@/stores/aiStore";
import { ModelSelector } from "./ModelSelector";
import type { AIModelOption } from "@/types/ai";

const IMAGE_MODELS: AIModelOption[] = [
  { id: "gemini-flash", name: "Gemini Flash", provider: "Google", credits: 1, tags: ["fast", "free-tier"], description: "Google's fast image generation" },
  { id: "gpt-image", name: "GPT Image", provider: "OpenAI", credits: 5, tags: ["hd", "accurate"], description: "OpenAI's high-quality image gen" },
  { id: "grok-aurora", name: "Grok Aurora", provider: "xAI", credits: 3, tags: ["creative", "fast"], description: "xAI's creative image generation" },
  { id: "flux-pro", name: "FLUX Pro", provider: "fal.ai", credits: 4, tags: ["photorealism", "hd"], description: "Ultra-realistic photo generation" },
  { id: "recraft-v3", name: "Recraft V3", provider: "fal.ai", credits: 3, tags: ["design", "vector"], description: "Design-focused image generation" },
];

interface AIGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageGenerated?: (imageData: { image?: string; image_url?: string }) => void;
}

export function AIGenerateModal({ isOpen, onClose, onImageGenerated }: AIGenerateModalProps) {
  const { setAIStatus } = useAIStore();
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-flash");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ image?: string; image_url?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setGenerating(true);
    setError(null);
    setResult(null);
    setAIStatus("processing", "画像を生成中...");

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model: selectedModel }),
      });

      if (!res.ok) {
        const data = await res.json() as { error: string };
        throw new Error(data.error ?? "生成に失敗しました");
      }

      const data = await res.json() as { image?: string; image_url?: string };
      setResult(data);
      onImageGenerated?.(data);
      setAIStatus("complete", "生成完了！");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setAIStatus("error", "生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  }, [prompt, selectedModel, setAIStatus, onImageGenerated]);

  const resultSrc = result?.image
    ? `data:image/png;base64,${result.image}`
    : result?.image_url ?? null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Image Generation" size="lg">
      <div className="space-y-4">
        {/* Prompt */}
        <div>
          <label className="block text-sm text-[var(--color-text-muted)] mb-1">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to generate..."
            className="w-full h-24 px-3 py-2 rounded-[var(--radius-lg)] bg-[var(--color-bg)] border border-[var(--color-border)]
              text-[var(--color-text)] placeholder-[var(--color-text-muted)] text-sm resize-none
              focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {/* Model Selection */}
        <div>
          <label className="block text-sm text-[var(--color-text-muted)] mb-2">Model</label>
          <ModelSelector
            models={IMAGE_MODELS}
            selected={selectedModel}
            onSelect={setSelectedModel}
          />
        </div>

        {/* Generate Button */}
        <Button
          variant="primary"
          size="lg"
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
          isLoading={generating}
          icon={!generating ? <ImageIcon size={18} /> : undefined}
          className="w-full"
        >
          {generating ? "生成中..." : `Generate (${IMAGE_MODELS.find((m) => m.id === selectedModel)?.credits ?? 0}cr)`}
        </Button>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--color-error-soft)] border border-[var(--color-error)] text-[var(--color-error)] text-sm">
            {error}
          </div>
        )}

        {/* Result */}
        {resultSrc && (
          <div className="space-y-2">
            <p className="text-sm text-[var(--color-text-muted)]">Result:</p>
            <img
              src={resultSrc}
              alt="Generated image"
              className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border)]"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
