"use client";

import { useState, useCallback } from "react";
import { useFFmpeg } from "@/hooks/useFFmpeg";
import { useEditorStore } from "@/stores/editorStore";
import { Button, DropZone, ProgressBar, Slider } from "@/components/ui";
import { FilmStrip, Info } from "@phosphor-icons/react";
import type { ConversionOptions, OutputFormat } from "@/types";

export function VideoConverter() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [options, setOptions] = useState<ConversionOptions>({
    format: "mp4",
    quality: 80,
  });

  const { convertVideo, extractAudio, isLoading, ffmpegLoaded } =
    useFFmpeg();
  const { processingState } = useEditorStore();

  const handleFilesSelected = useCallback((files: File[]) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  }, []);

  const handleConvert = async () => {
    if (!selectedFile) return;

    const blob = await convertVideo(selectedFile, options);
    if (blob) {
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
      downloadBlob(blob, `${baseName}_converted.${options.format}`);
    }
  };

  const handleExtractAudio = async () => {
    if (!selectedFile) return;

    const blob = await extractAudio(selectedFile);
    if (blob) {
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
      downloadBlob(blob, `${baseName}_audio.mp3`);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatOptions: { value: OutputFormat; label: string }[] = [
    { value: "mp4", label: "MP4 (H.264)" },
    { value: "webm", label: "WebM (VP9)" },
    { value: "mov", label: "MOV" },
    { value: "avi", label: "AVI" },
    { value: "mkv", label: "MKV" },
    { value: "gif", label: "GIF" },
  ];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-[var(--color-text)] mb-6">
        動画変換
      </h2>

      {/* File selection */}
      <div className="mb-6">
        {selectedFile ? (
          <div className="bg-[var(--color-bg)] rounded-[var(--radius-lg)] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[var(--color-border)] rounded-[var(--radius-md)] flex items-center justify-center">
                  <FilmStrip size={24} weight="bold" className="text-[var(--color-text-muted)]" />
                </div>
                <div>
                  <p className="font-medium text-[var(--color-text)]">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
              >
                変更
              </Button>
            </div>
          </div>
        ) : (
          <DropZone
            onFilesSelected={handleFilesSelected}
            accept="video"
            multiple={false}
          />
        )}
      </div>

      {/* Options */}
      {selectedFile && (
        <div className="space-y-6 mb-6">
          {/* Output format */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              出力形式
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {formatOptions.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setOptions({ ...options, format: value })}
                  className={`
                    px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors
                    ${
                      options.format === value
                        ? "bg-[var(--color-accent)] text-white"
                        : "bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent-text)]"
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Quality slider */}
          {options.format !== "gif" && (
            <Slider
              label="品質"
              min={1}
              max={100}
              value={options.quality || 80}
              unit="%"
              onChange={(e) =>
                setOptions({ ...options, quality: parseInt(e.target.value, 10) })
              }
            />
          )}

          {/* Resolution (optional) */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              解像度（オプション）
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "元のまま", width: undefined, height: undefined },
                { label: "1080p", width: 1920, height: 1080 },
                { label: "720p", width: 1280, height: 720 },
                { label: "480p", width: 854, height: 480 },
              ].map(({ label, width, height }) => (
                <button
                  key={label}
                  onClick={() => setOptions({ ...options, width, height })}
                  className={`
                    px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors
                    ${
                      options.width === width
                        ? "bg-[var(--color-accent)] text-white"
                        : "bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent-text)]"
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      {processingState.status === "processing" && (
        <div className="mb-6">
          <ProgressBar
            progress={processingState.progress}
            message={processingState.message}
          />
        </div>
      )}

      {/* Actions */}
      {selectedFile && (
        <div className="flex gap-3">
          <Button
            variant="primary"
            onClick={handleConvert}
            isLoading={isLoading || processingState.status === "processing"}
            disabled={!ffmpegLoaded && !isLoading}
            className="flex-1"
          >
            {isLoading && !ffmpegLoaded
              ? "FFmpegを読み込み中..."
              : `${options.format.toUpperCase()}に変換`}
          </Button>
          <Button
            variant="secondary"
            onClick={handleExtractAudio}
            disabled={isLoading || processingState.status === "processing"}
          >
            音声抽出
          </Button>
        </div>
      )}

      {/* Info */}
      <div className="mt-8 p-4 bg-[var(--color-accent-soft)] rounded-[var(--radius-lg)] flex items-start gap-3">
        <Info size={20} weight="bold" className="text-[var(--color-accent-text)] flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-[var(--color-accent-text)] mb-2">
            ブラウザ内処理について
          </h3>
          <p className="text-sm text-[var(--color-accent-text)]">
            全ての処理はお使いのブラウザ内で行われます。ファイルがサーバーにアップロードされることはありません。
            処理中はブラウザのタブを閉じないでください。
          </p>
        </div>
      </div>
    </div>
  );
}
