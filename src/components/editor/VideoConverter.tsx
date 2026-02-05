"use client";

import { useState, useCallback } from "react";
import { useFFmpeg } from "@/hooks/useFFmpeg";
import { useEditorStore } from "@/stores/editorStore";
import { Button, DropZone, ProgressBar, Slider } from "@/components/ui";
import { toast } from "@/stores/toastStore";
import type { ConversionOptions, OutputFormat } from "@/types";

export function VideoConverter() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [options, setOptions] = useState<ConversionOptions>({
    format: "mp4",
    quality: 80,
  });

  const { convertVideo, trimVideo, extractAudio, isLoading, progress, ffmpegLoaded } =
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
      downloadBlob(blob, `converted_${Date.now()}.${options.format}`);
    }
  };

  const handleExtractAudio = async () => {
    if (!selectedFile) return;

    const blob = await extractAudio(selectedFile);
    if (blob) {
      downloadBlob(blob, `audio_${Date.now()}.mp3`);
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
    { value: "gif", label: "GIF" },
  ];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        動画変換
      </h2>

      {/* File selection */}
      <div className="mb-6">
        {selectedFile ? (
          <div className="bg-gray-50 dark:bg-dark-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 dark:bg-dark-700 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              出力形式
            </label>
            <div className="grid grid-cols-3 gap-2">
              {formatOptions.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setOptions({ ...options, format: value })}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      options.format === value
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                    px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      options.width === width
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600"
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
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
          ブラウザ内処理について
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-400">
          全ての処理はお使いのブラウザ内で行われます。ファイルがサーバーにアップロードされることはありません。
          処理中はブラウザのタブを閉じないでください。
        </p>
      </div>
    </div>
  );
}
