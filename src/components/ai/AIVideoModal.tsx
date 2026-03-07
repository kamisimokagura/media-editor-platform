"use client";

import React, { useState, useCallback } from "react";
import { FilmStrip } from "@phosphor-icons/react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAIStore } from "@/stores/aiStore";
import { ModelSelector } from "./ModelSelector";
import type { AIModelOption } from "@/types/ai";

const VIDEO_MODELS: AIModelOption[] = [
  { id: "seedance-2", name: "Seedance 2.0", provider: "fal.ai", credits: 10, tags: ["dance", "motion"], description: "High-quality dance/motion video" },
  { id: "kling-3", name: "Kling 3.0", provider: "fal.ai", credits: 8, tags: ["cinematic", "hd"], description: "Cinematic video generation" },
  { id: "veo-3", name: "Veo 3.1", provider: "fal.ai", credits: 12, tags: ["photorealism", "long"], description: "Google's photorealistic video" },
  { id: "wan-2.6", name: "Wan 2.6", provider: "fal.ai", credits: 6, tags: ["fast", "efficient"], description: "Fast efficient video generation" },
  { id: "pika-2.5", name: "Pika 2.5", provider: "fal.ai", credits: 7, tags: ["creative", "effects"], description: "Creative effects & transitions" },
  { id: "sora", name: "Sora 2", provider: "OpenAI", credits: 15, tags: ["premium", "hd"], description: "OpenAI's premium video model" },
  { id: "grok-imagine", name: "Grok Imagine", provider: "xAI", credits: 8, tags: ["fast", "creative"], description: "xAI's video generation" },
];

interface AIVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoGenerated?: (videoUrl: string) => void;
}

export function AIVideoModal({ isOpen, onClose, onVideoGenerated }: AIVideoModalProps) {
  const { setAIStatus } = useAIStore();
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("wan-2.6");
  const [duration, setDuration] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setGenerating(true);
    setError(null);
    setResult(null);
    setAIStatus("processing", "動画を生成中...");

    try {
      const res = await fetch("/api/ai/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model: selectedModel, duration }),
      });

      if (!res.ok) {
        const data = await res.json() as { error: string };
        throw new Error(data.error ?? "生成に失敗しました");
      }

      const data = await res.json() as { video_url: string };
      setResult(data.video_url);
      onVideoGenerated?.(data.video_url);
      setAIStatus("complete", "生成完了！");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setAIStatus("error", "生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  }, [prompt, selectedModel, duration, setAIStatus, onVideoGenerated]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Video Generation" size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-[var(--color-text-muted)] mb-1">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the video you want to generate..."
            className="w-full h-24 px-3 py-2 rounded-[var(--radius-lg)] bg-[var(--color-bg)] border border-[var(--color-border)]
              text-[var(--color-text)] placeholder-[var(--color-text-muted)] text-sm resize-none
              focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--color-text-muted)] mb-2">Model</label>
          <ModelSelector models={VIDEO_MODELS} selected={selectedModel} onSelect={setSelectedModel} />
        </div>

        <div>
          <label className="block text-sm text-[var(--color-text-muted)] mb-1">Duration: {duration}s</label>
          <input
            type="range"
            min={2}
            max={15}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
          isLoading={generating}
          icon={!generating ? <FilmStrip size={18} /> : undefined}
          className="w-full"
        >
          {generating ? "生成中..." : `Generate Video (${VIDEO_MODELS.find((m) => m.id === selectedModel)?.credits ?? 0}cr)`}
        </Button>

        {error && (
          <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--color-error-soft)] border border-[var(--color-error)] text-[var(--color-error)] text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <p className="text-sm text-[var(--color-text-muted)]">Result:</p>
            <video src={result} controls className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border)]" />
            <a href={result} download>
              <Button variant="secondary" size="md" className="w-full">
                Download Video
              </Button>
            </a>
          </div>
        )}
      </div>
    </Modal>
  );
}
