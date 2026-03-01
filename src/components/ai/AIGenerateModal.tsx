"use client";

import React, { useState, useCallback } from "react";
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

  if (!isOpen) return null;

  const resultSrc = result?.image
    ? `data:image/png;base64,${result.image}`
    : result?.image_url ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto
        bg-dark-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">AI Image Generation</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Prompt */}
          <div>
            <label className="block text-sm text-white/60 mb-1">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              className="w-full h-24 px-3 py-2 rounded-xl bg-white/5 border border-white/10
                text-white placeholder-white/30 text-sm resize-none
                focus:outline-none focus:border-purple-500/50"
            />
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Model</label>
            <ModelSelector
              models={IMAGE_MODELS}
              selected={selectedModel}
              onSelect={setSelectedModel}
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="w-full py-3 rounded-xl font-medium text-white transition-all duration-200
              bg-gradient-to-r from-purple-500 to-pink-500
              hover:from-purple-600 hover:to-pink-600
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                生成中...
              </span>
            ) : (
              `Generate (${IMAGE_MODELS.find((m) => m.id === selectedModel)?.credits ?? 0}cr)`
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Result */}
          {resultSrc && (
            <div className="space-y-2">
              <p className="text-sm text-white/60">Result:</p>
              <img
                src={resultSrc}
                alt="Generated image"
                className="w-full rounded-xl border border-white/10"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
