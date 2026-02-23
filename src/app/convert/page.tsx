"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { Header } from "@/components/layout";
import { useFFmpeg } from "@/hooks/useFFmpeg";
import { useEditorStore } from "@/stores/editorStore";
import { Button, DropZone, ProgressBar, Slider } from "@/components/ui";
import { ANALYTICS_EVENTS, trackClientEvent, trackPageView } from "@/lib/analytics/client";
import { toast } from "@/stores/toastStore";
import { isHeicFile, ensureBrowserCompatibleImage } from "@/lib/heicConverter";
import { isRawFile, ensureBrowserCompatibleRawImage } from "@/lib/rawConverter";
import type { ConversionOptions, OutputFormat } from "@/types";

type MediaMode = "video" | "image";
type ImageFormat = "png" | "jpg" | "webp" | "gif" | "avif" | "bmp";
type ImageOutputMode = "file" | "base64";

interface QueueItem {
  id: string;
  file: File;
  previewUrl: string | null;
  status: "pending" | "processing" | "done" | "error";
  dimensions?: { width: number; height: number };
}

const videoFormatOptions: { value: OutputFormat; label: string }[] = [
  { value: "mp4", label: "MP4 (H.264)" },
  { value: "webm", label: "WebM (VP9)" },
  { value: "mov", label: "MOV" },
  { value: "avi", label: "AVI" },
  { value: "mkv", label: "MKV" },
  { value: "gif", label: "GIF" },
];

const imageFormatOptions: { value: ImageFormat; label: string; description: string }[] = [
  { value: "webp", label: "WebP", description: "軽量で高画質" },
  { value: "png", label: "PNG", description: "可逆圧縮 / 透過対応" },
  { value: "jpg", label: "JPG", description: "高互換で軽量" },
  { value: "avif", label: "AVIF", description: "次世代高圧縮" },
  { value: "bmp", label: "BMP", description: "無圧縮形式" },
  { value: "gif", label: "GIF", description: "アニメ対応" },
];

function getImageMimeInfo(format: ImageFormat): { mimeType: string; extension: string } {
  switch (format) {
    case "png": return { mimeType: "image/png", extension: "png" };
    case "jpg": return { mimeType: "image/jpeg", extension: "jpg" };
    case "webp": return { mimeType: "image/webp", extension: "webp" };
    case "avif": return { mimeType: "image/avif", extension: "avif" };
    case "bmp": return { mimeType: "image/bmp", extension: "bmp" };
    case "gif": return { mimeType: "image/gif", extension: "gif" };
    default: return { mimeType: "image/webp", extension: "webp" };
  }
}

let nextId = 0;
function genId() {
  return `q_${++nextId}_${Date.now()}`;
}

export default function ConvertPage() {
  const [mode, setMode] = useState<MediaMode>("video");
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const [videoOptions, setVideoOptions] = useState<ConversionOptions>({
    format: "mp4",
    quality: 80,
  });

  const [imageFormat, setImageFormat] = useState<ImageFormat>("webp");
  const [imageQuality, setImageQuality] = useState(90);
  const [imageOutputMode, setImageOutputMode] = useState<ImageOutputMode>("file");
  const [base64Result, setBase64Result] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingId, setCurrentProcessingId] = useState<string | null>(null);
  const abortRef = useRef(false);

  const { convertVideo, extractAudio, isLoading, ffmpegLoaded } = useFFmpeg();
  const { processingState } = useEditorStore();

  useEffect(() => {
    return () => {
      queue.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  useEffect(() => {
    void trackPageView("/convert");
  }, []);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setBase64Result("");

      const newItems: QueueItem[] = [];

      for (const rawFile of files) {
        let file = rawFile;
        let detectedMode: MediaMode = mode;

        if (isHeicFile(file)) {
          toast.info(`${file.name}: HEIC変換中...`);
          file = await ensureBrowserCompatibleImage(file);
          detectedMode = "image";
        } else if (isRawFile(file)) {
          toast.info(`${file.name}: RAW変換中...`);
          file = await ensureBrowserCompatibleRawImage(file);
          detectedMode = "image";
        } else if (file.type.startsWith("video/")) {
          detectedMode = "video";
        } else if (file.type.startsWith("image/")) {
          detectedMode = "image";
        }

        // Auto-detect mode from first file if queue is empty
        if (queue.length === 0 && newItems.length === 0) {
          setMode(detectedMode);
        }

        const previewUrl = URL.createObjectURL(file);
        const item: QueueItem = {
          id: genId(),
          file,
          previewUrl,
          status: "pending",
        };

        // Get image dimensions
        if (detectedMode === "image") {
          const img = new Image();
          img.src = previewUrl;
          await new Promise<void>((resolve) => {
            img.onload = () => {
              item.dimensions = { width: img.naturalWidth, height: img.naturalHeight };
              resolve();
            };
            img.onerror = () => resolve();
          });
        }

        newItems.push(item);

        void trackClientEvent({
          eventName: ANALYTICS_EVENTS.FILE_SELECTED,
          pagePath: "/convert",
          eventParams: {
            media_type: detectedMode,
            mime_type: file.type,
            file_name: file.name,
            file_size_bytes: file.size,
          },
        });
      }

      setQueue((prev) => [...prev, ...newItems]);
    },
    [mode, queue.length]
  );

  const removeFromQueue = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((q) => q.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((q) => q.id !== id);
    });
  };

  const clearQueue = () => {
    queue.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setQueue([]);
    setBase64Result("");
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const convertSingleImage = async (item: QueueItem): Promise<boolean> => {
    if (!item.previewUrl) return false;

    const img = new Image();
    img.src = item.previewUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    if (imageFormat === "jpg" || imageFormat === "bmp") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);

    const { mimeType, extension } = getImageMimeInfo(imageFormat);
    const quality = imageFormat === "png" || imageFormat === "bmp" ? undefined : imageQuality / 100;

    if (imageOutputMode === "base64") {
      try {
        const dataUrl = canvas.toDataURL(mimeType, quality);
        setBase64Result((prev) => prev ? prev + "\n---\n" + dataUrl : dataUrl);
      } catch {
        const dataUrl = canvas.toDataURL("image/webp", imageQuality / 100);
        setBase64Result((prev) => prev ? prev + "\n---\n" + dataUrl : dataUrl);
      }
      return true;
    }

    return new Promise<boolean>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const baseName = item.file.name.replace(/\.[^/.]+$/, "");
            downloadBlob(blob, `${baseName}_converted.${extension}`);
            resolve(true);
          } else {
            canvas.toBlob(
              (fallbackBlob) => {
                if (fallbackBlob) {
                  const baseName = item.file.name.replace(/\.[^/.]+$/, "");
                  downloadBlob(fallbackBlob, `${baseName}_converted.webp`);
                }
                resolve(!!fallbackBlob);
              },
              "image/webp",
              imageQuality / 100
            );
          }
        },
        mimeType,
        quality
      );
    });
  };

  const handleConvertAll = async () => {
    const pendingItems = queue.filter((q) => q.status === "pending" || q.status === "error");
    if (!pendingItems.length) return;

    setIsProcessing(true);
    abortRef.current = false;
    setBase64Result("");

    let successCount = 0;
    let errorCount = 0;

    for (const item of pendingItems) {
      if (abortRef.current) break;

      setCurrentProcessingId(item.id);
      setQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: "processing" } : q));

      try {
        let success = false;

        if (mode === "video") {
          const blob = await convertVideo(item.file, videoOptions);
          if (blob) {
            const baseName = item.file.name.replace(/\.[^/.]+$/, "");
            downloadBlob(blob, `${baseName}_converted.${videoOptions.format}`);
            success = true;
          }
        } else {
          success = await convertSingleImage(item);
        }

        setQueue((prev) =>
          prev.map((q) => q.id === item.id ? { ...q, status: success ? "done" : "error" } : q)
        );
        if (success) successCount++;
        else errorCount++;
      } catch (error) {
        console.error(`Conversion error for ${item.file.name}:`, error);
        setQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: "error" } : q));
        errorCount++;
      }
    }

    setCurrentProcessingId(null);
    setIsProcessing(false);

    if (successCount > 0) {
      toast.success(`${successCount}件の変換が完了しました${errorCount > 0 ? ` (${errorCount}件エラー)` : ""}`);
    } else if (errorCount > 0) {
      toast.error(`${errorCount}件の変換に失敗しました`);
    }

    void trackClientEvent({
      eventName: ANALYTICS_EVENTS.CONVERT_COMPLETE,
      pagePath: "/convert",
      eventParams: {
        media_type: mode,
        output_format: mode === "video" ? videoOptions.format : imageFormat,
        batch_size: pendingItems.length,
        success_count: successCount,
        error_count: errorCount,
      },
    });
  };

  const handleExtractAudioAll = async () => {
    const pendingItems = queue.filter((q) => q.status === "pending" || q.status === "error");
    if (!pendingItems.length) return;

    setIsProcessing(true);

    for (const item of pendingItems) {
      setCurrentProcessingId(item.id);
      setQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: "processing" } : q));

      const blob = await extractAudio(item.file);
      if (blob) {
        const baseName = item.file.name.replace(/\.[^/.]+$/, "");
        downloadBlob(blob, `${baseName}_audio.mp3`);
        setQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: "done" } : q));
      } else {
        setQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: "error" } : q));
      }
    }

    setCurrentProcessingId(null);
    setIsProcessing(false);
    toast.success("音声抽出が完了しました");
  };

  const handleCopyBase64 = async () => {
    if (!base64Result) return;
    try {
      await navigator.clipboard.writeText(base64Result);
      toast.success("Base64 text copied");
    } catch (error) {
      console.error(error);
      toast.error("Failed to copy Base64 text");
    }
  };

  const handleDownloadBase64 = () => {
    if (!base64Result) return;
    const blob = new Blob([base64Result], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, `converted_${Date.now()}.txt`);
  };

  const pendingCount = queue.filter((q) => q.status === "pending" || q.status === "error").length;
  const doneCount = queue.filter((q) => q.status === "done").length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
      <Header />

      <div className="w-full flex justify-center">
        <div className="w-full max-w-5xl px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
          <div className="text-center mb-10">
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              メディア変換ツール
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
              動画・画像をブラウザ内で変換。複数ファイルの一括変換にも対応しています。
            </p>
          </div>

          <div className="flex justify-center mb-8">
            <div className="w-full max-w-md inline-grid grid-cols-2 bg-white dark:bg-dark-800 rounded-2xl p-1.5 shadow-lg">
              <button
                onClick={() => { setMode("video"); clearQueue(); }}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  mode === "video"
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                動画変換
              </button>
              <button
                onClick={() => { setMode("image"); clearQueue(); }}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  mode === "image"
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                画像変換
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-3xl shadow-xl p-5 sm:p-8 overflow-hidden">
            {/* Drop zone - always visible when not processing */}
            <div className="mb-8">
              <DropZone
                onFilesSelected={handleFilesSelected}
                accept={mode === "video" ? "video" : "image"}
                multiple={true}
                maxFiles={20}
                className={`w-full ${queue.length > 0 ? "min-h-[120px] !py-5" : "min-h-[280px] !py-10"}`}
              />
            </div>

            {/* File queue list */}
            {queue.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    ファイル一覧
                    <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                      {queue.length}件{doneCount > 0 ? ` (${doneCount}件完了)` : ""}
                    </span>
                  </h3>
                  <Button variant="ghost" size="sm" onClick={clearQueue} disabled={isProcessing}>
                    すべてクリア
                  </Button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {queue.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        item.status === "done"
                          ? "bg-green-50 dark:bg-green-900/10"
                          : item.status === "error"
                          ? "bg-red-50 dark:bg-red-900/10"
                          : item.status === "processing"
                          ? "bg-blue-50 dark:bg-blue-900/10"
                          : "bg-gray-50 dark:bg-dark-700"
                      }`}
                    >
                      {/* Thumbnail */}
                      {item.previewUrl && mode === "image" ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 dark:bg-dark-600 flex-shrink-0">
                          <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}

                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {item.file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(item.file.size / 1024 / 1024).toFixed(2)} MB
                          {item.dimensions && ` • ${item.dimensions.width}x${item.dimensions.height}`}
                        </p>
                      </div>

                      {/* Status indicator */}
                      <div className="flex-shrink-0">
                        {item.status === "done" && (
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {item.status === "error" && (
                          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        {item.status === "processing" && (
                          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        )}
                        {item.status === "pending" && !isProcessing && (
                          <button
                            onClick={() => removeFromQueue(item.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conversion options */}
            {queue.length > 0 && mode === "video" && (
              <div className="space-y-7 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">出力形式</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {videoFormatOptions.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setVideoOptions({ ...videoOptions, format: value })}
                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                          videoOptions.format === value
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                            : "bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {videoOptions.format !== "gif" && (
                  <Slider label="品質" min={1} max={100} value={videoOptions.quality || 80} unit="%"
                    onChange={(e) => setVideoOptions({ ...videoOptions, quality: parseInt(e.target.value, 10) })}
                  />
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">解像度</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "元のまま", width: undefined, height: undefined },
                      { label: "1080p", width: 1920, height: 1080 },
                      { label: "720p", width: 1280, height: 720 },
                      { label: "480p", width: 854, height: 480 },
                    ].map(({ label, width, height }) => (
                      <button
                        key={label}
                        onClick={() => setVideoOptions({ ...videoOptions, width, height })}
                        className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          videoOptions.width === width
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                            : "bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {queue.length > 0 && mode === "image" && (
              <div className="space-y-7 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">出力形式</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {imageFormatOptions.map(({ value, label, description }) => (
                      <button
                        key={value}
                        onClick={() => setImageFormat(value)}
                        className={`px-4 py-4 rounded-xl text-sm font-medium transition-all text-center ${
                          imageFormat === value
                            ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                            : "bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600"
                        }`}
                      >
                        <span className="block font-semibold">{label}</span>
                        <span className={`block text-xs mt-1 ${imageFormat === value ? "text-white/80" : "text-gray-500"}`}>
                          {description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">出力タイプ</label>
                  <div className="inline-flex bg-gray-100 dark:bg-dark-700 rounded-xl p-1">
                    <button
                      onClick={() => setImageOutputMode("file")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        imageOutputMode === "file"
                          ? "bg-white dark:bg-dark-600 text-gray-900 dark:text-white shadow-sm"
                          : "text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      ファイル
                    </button>
                    <button
                      onClick={() => setImageOutputMode("base64")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        imageOutputMode === "base64"
                          ? "bg-white dark:bg-dark-600 text-gray-900 dark:text-white shadow-sm"
                          : "text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      Base64
                    </button>
                  </div>
                </div>

                {imageFormat !== "png" && imageFormat !== "bmp" && (
                  <>
                    <Slider label="品質" min={10} max={100} value={imageQuality} unit="%"
                      onChange={(e) => setImageQuality(parseInt(e.target.value, 10))}
                    />
                    <div className="flex flex-wrap gap-2 -mt-4">
                      {[
                        { label: "低圧縮 (90%)", value: 90 },
                        { label: "標準 (80%)", value: 80 },
                        { label: "高圧縮 (50%)", value: 50 },
                        { label: "最大圧縮 (20%)", value: 20 },
                      ].map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => setImageQuality(preset.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            imageQuality === preset.value
                              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md"
                              : "bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Processing indicator */}
            {(processingState.status === "processing" || isProcessing) && (
              <div className="mb-8">
                <ProgressBar
                  progress={processingState.progress || 50}
                  message={processingState.message || "Processing..."}
                />
              </div>
            )}

            {/* Action buttons */}
            {queue.length > 0 && pendingCount > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {mode === "video" ? (
                  <>
                    <Button
                      variant="primary"
                      onClick={handleConvertAll}
                      isLoading={isLoading || isProcessing}
                      disabled={!ffmpegLoaded && !isLoading}
                      className="flex-1 !py-4 bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      {isLoading && !ffmpegLoaded
                        ? "FFmpeg loading..."
                        : `${pendingCount}件を ${videoOptions.format.toUpperCase()} に変換`}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleExtractAudioAll}
                      disabled={isLoading || isProcessing}
                      className="!py-4"
                    >
                      音声抽出
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="primary"
                    onClick={handleConvertAll}
                    isLoading={isProcessing}
                    className="flex-1 !py-4 bg-gradient-to-r from-purple-600 to-pink-600"
                  >
                    {imageOutputMode === "base64"
                      ? `${pendingCount}件を Base64 に変換`
                      : `${pendingCount}件を ${imageFormat.toUpperCase()} に変換`}
                  </Button>
                )}
              </div>
            )}

            {/* Base64 result */}
            {base64Result && (
              <div className="mt-8 p-4 sm:p-5 bg-gray-50 dark:bg-dark-700 rounded-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Base64 出力</h3>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={handleCopyBase64}>Copy</Button>
                    <Button variant="secondary" size="sm" onClick={handleDownloadBase64}>Download .txt</Button>
                  </div>
                </div>
                <textarea
                  value={base64Result}
                  readOnly
                  className="w-full min-h-[180px] max-h-[320px] p-3 text-xs font-mono bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-xl text-gray-800 dark:text-gray-200"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Length: {base64Result.length.toLocaleString()} characters
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 sm:p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
            <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
              すべての処理はブラウザ内で実行されます。ファイルがサーバーにアップロードされることはありません。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
