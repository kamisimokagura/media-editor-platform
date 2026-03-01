"use client";

import React, { useState, useCallback } from "react";
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto
        bg-dark-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">

        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">AI Video Generation</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the video you want to generate..."
              className="w-full h-24 px-3 py-2 rounded-xl bg-white/5 border border-white/10
                text-white placeholder-white/30 text-sm resize-none
                focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">Model</label>
            <ModelSelector models={VIDEO_MODELS} selected={selectedModel} onSelect={setSelectedModel} />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Duration: {duration}s</label>
            <input
              type="range"
              min={2}
              max={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

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
              `Generate Video (${VIDEO_MODELS.find((m) => m.id === selectedModel)?.credits ?? 0}cr)`
            )}
          </button>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-2">
              <p className="text-sm text-white/60">Result:</p>
              <video src={result} controls className="w-full rounded-xl border border-white/10" />
              <a href={result} download className="block w-full py-2 text-sm text-center rounded-lg
                bg-white/5 hover:bg-white/10 text-white/70 transition-colors">
                Download Video
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
