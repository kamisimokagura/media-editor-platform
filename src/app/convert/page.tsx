"use client";

import { useState, useCallback, useRef } from "react";
import { Header } from "@/components/layout";
import { useFFmpeg } from "@/hooks/useFFmpeg";
import { useEditorStore } from "@/stores/editorStore";
import { Button, DropZone, ProgressBar, Slider } from "@/components/ui";
import { toast } from "@/stores/toastStore";
// TODO: Re-enable when CDN-based loading is implemented (heic2any/libraw-wasm cause Turbopack build hang)
// import { isHeicFile, ensureBrowserCompatibleImage } from "@/lib/heicConverter";
// import { isRawFile, ensureBrowserCompatibleRawImage } from "@/lib/rawConverter";
import type { ConversionOptions, OutputFormat } from "@/types";

type MediaMode = "video" | "image";
type ImageFormat = "png" | "jpg" | "webp" | "gif" | "avif" | "bmp";

export default function ConvertPage() {
  const [mode, setMode] = useState<MediaMode>("video");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Video options
  const [videoOptions, setVideoOptions] = useState<ConversionOptions>({
    format: "mp4",
    quality: 80,
  });

  // Image options
  const [imageFormat, setImageFormat] = useState<ImageFormat>("webp");
  const [imageQuality, setImageQuality] = useState(90);
  const [resizeWidth, setResizeWidth] = useState<number | null>(null);
  const [resizeHeight, setResizeHeight] = useState<number | null>(null);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [originalDimensions, setOriginalDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const { convertVideo, extractAudio, isLoading, ffmpegLoaded } = useFFmpeg();
  const { processingState } = useEditorStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (files.length > 0) {
        let file = files[0];

        // TODO: Re-enable HEIC/RAW support when CDN-based loading is implemented
        // if (isHeicFile(file)) {
        //   toast.info("HEIC画像を変換中...");
        //   file = await ensureBrowserCompatibleImage(file);
        //   setMode("image");
        // } else if (isRawFile(file)) {
        //   toast.info("RAW画像を変換中...");
        //   file = await ensureBrowserCompatibleRawImage(file);
        //   setMode("image");
        // } else
        if (file.type.startsWith("video/")) {
          setMode("video");
        } else if (file.type.startsWith("image/")) {
          setMode("image");
        }

        // Auto-detect mode based on file type
        if (mode === "image" || file.type.startsWith("image/")) {
          // Load image and get dimensions
          const img = new Image();
          img.onload = () => {
            setOriginalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            setResizeWidth(img.naturalWidth);
            setResizeHeight(img.naturalHeight);
          };
          img.src = URL.createObjectURL(file);
        }

        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
    },
    [mode]
  );

  const handleResizeWidthChange = (newWidth: number) => {
    setResizeWidth(newWidth);
    if (maintainAspectRatio && originalDimensions) {
      const ratio = originalDimensions.height / originalDimensions.width;
      setResizeHeight(Math.round(newWidth * ratio));
    }
  };

  const handleResizeHeightChange = (newHeight: number) => {
    setResizeHeight(newHeight);
    if (maintainAspectRatio && originalDimensions) {
      const ratio = originalDimensions.width / originalDimensions.height;
      setResizeWidth(Math.round(newHeight * ratio));
    }
  };

  const handleConvertVideo = async () => {
    if (!selectedFile) return;

    const blob = await convertVideo(selectedFile, videoOptions);
    if (blob) {
      downloadBlob(blob, `converted_${Date.now()}.${videoOptions.format}`);
    }
  };

  const handleExtractAudio = async () => {
    if (!selectedFile) return;

    const blob = await extractAudio(selectedFile);
    if (blob) {
      downloadBlob(blob, `audio_${Date.now()}.mp3`);
    }
  };

  const handleConvertImage = async () => {
    if (!selectedFile || !previewUrl) return;

    setIsProcessing(true);

    try {
      const img = new Image();
      img.src = previewUrl;

      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        toast.error("Canvas context not available");
        return;
      }

      // Set canvas dimensions
      const targetWidth = resizeWidth || img.naturalWidth;
      const targetHeight = resizeHeight || img.naturalHeight;
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Draw image
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Convert to desired format
      let mimeType: string;
      let extension: string;

      switch (imageFormat) {
        case "png":
          mimeType = "image/png";
          extension = "png";
          break;
        case "jpg":
          mimeType = "image/jpeg";
          extension = "jpg";
          break;
        case "webp":
          mimeType = "image/webp";
          extension = "webp";
          break;
        case "avif":
          mimeType = "image/avif";
          extension = "avif";
          break;
        case "bmp":
          mimeType = "image/bmp";
          extension = "bmp";
          break;
        case "gif":
          mimeType = "image/gif";
          extension = "gif";
          break;
        default:
          mimeType = "image/webp";
          extension = "webp";
      }

      const quality = (imageFormat === "png" || imageFormat === "bmp") ? undefined : imageQuality / 100;
      canvas.toBlob(
        (blob) => {
          if (blob) {
            downloadBlob(blob, `converted_${Date.now()}.${extension}`);
            toast.success("画像変換が完了しました");
            setIsProcessing(false);
          } else {
            // Fallback for unsupported formats (AVIF/BMP in some browsers)
            const fallbackMime = "image/webp";
            const fallbackExt = "webp";
            canvas.toBlob(
              (fallbackBlob) => {
                if (fallbackBlob) {
                  downloadBlob(fallbackBlob, `converted_${Date.now()}.${fallbackExt}`);
                  toast.warning(`${imageFormat.toUpperCase()}非対応のため、WebPで出力しました`);
                }
                setIsProcessing(false);
              },
              fallbackMime,
              imageQuality / 100
            );
          }
        },
        mimeType,
        quality
      );
    } catch (error) {
      console.error("Image conversion error:", error);
      toast.error("画像変換に失敗しました");
      setIsProcessing(false);
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

  const videoFormatOptions: { value: OutputFormat; label: string }[] = [
    { value: "mp4", label: "MP4 (H.264)" },
    { value: "webm", label: "WebM (VP9)" },
    { value: "mov", label: "MOV" },
    { value: "avi", label: "AVI" },
    { value: "mkv", label: "MKV" },
    { value: "gif", label: "GIF" },
  ];

  const imageFormatOptions: { value: ImageFormat; label: string; description: string }[] = [
    { value: "webp", label: "WebP", description: "高圧縮・透過対応" },
    { value: "png", label: "PNG", description: "可逆圧縮・透過対応" },
    { value: "jpg", label: "JPG", description: "高圧縮・写真向け" },
    { value: "avif", label: "AVIF", description: "最新高圧縮形式" },
    { value: "bmp", label: "BMP", description: "非圧縮・互換性高" },
    { value: "gif", label: "GIF", description: "256色・透過対応" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
      <Header />

      <div className="w-full flex justify-center">
        <div className="w-full max-w-4xl px-8 sm:px-12 lg:px-20 py-12">
        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            メディア変換ツール
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            動画・画像を様々なフォーマットに変換
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-white dark:bg-dark-800 rounded-2xl p-1.5 shadow-lg">
            <button
              onClick={() => {
                setMode("video");
                setSelectedFile(null);
                setPreviewUrl(null);
              }}
              className={`px-8 py-3 rounded-xl text-sm font-medium transition-all ${
                mode === "video"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                動画変換
              </span>
            </button>
            <button
              onClick={() => {
                setMode("image");
                setSelectedFile(null);
                setPreviewUrl(null);
              }}
              className={`px-8 py-3 rounded-xl text-sm font-medium transition-all ${
                mode === "image"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                画像変換
              </span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-dark-800 rounded-3xl shadow-xl p-8 sm:p-10">
          {/* File Selection */}
          <div className="mb-8">
            {selectedFile ? (
              <div className="bg-gray-50 dark:bg-dark-700 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Preview Thumbnail */}
                    {previewUrl && mode === "image" && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-200 dark:bg-dark-600">
                        <img
                          ref={imageRef}
                          src={previewUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {mode === "video" && (
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white truncate max-w-xs">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        {originalDimensions && ` • ${originalDimensions.width} x ${originalDimensions.height}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setOriginalDimensions(null);
                    }}
                  >
                    変更
                  </Button>
                </div>
              </div>
            ) : (
              <DropZone
                onFilesSelected={handleFilesSelected}
                accept={mode === "video" ? "video" : "image"}
                multiple={false}
                className="!py-12"
              />
            )}
          </div>

          {/* Options - Video */}
          {selectedFile && mode === "video" && (
            <div className="space-y-8 mb-8">
              {/* Output format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  出力形式
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
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

              {/* Quality slider */}
              {videoOptions.format !== "gif" && (
                <Slider
                  label="品質"
                  min={1}
                  max={100}
                  value={videoOptions.quality || 80}
                  unit="%"
                  onChange={(e) =>
                    setVideoOptions({ ...videoOptions, quality: parseInt(e.target.value, 10) })
                  }
                />
              )}

              {/* Resolution */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  解像度
                </label>
                <div className="grid grid-cols-4 gap-3">
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

          {/* Options - Image */}
          {selectedFile && mode === "image" && (
            <div className="space-y-8 mb-8">
              {/* Output format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  出力形式
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

              {/* Quality slider (not for PNG) */}
              {imageFormat !== "png" && (
                <Slider
                  label="品質"
                  min={10}
                  max={100}
                  value={imageQuality}
                  unit="%"
                  onChange={(e) => setImageQuality(parseInt(e.target.value, 10))}
                />
              )}

              {/* Resize */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  サイズ変更
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      幅 (px)
                    </label>
                    <input
                      type="number"
                      value={resizeWidth || ""}
                      onChange={(e) => handleResizeWidthChange(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      高さ (px)
                    </label>
                    <input
                      type="number"
                      value={resizeHeight || ""}
                      onChange={(e) => handleResizeHeightChange(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-3 bg-gray-100 dark:bg-dark-700 border-0 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={maintainAspectRatio}
                    onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    縦横比を維持
                  </span>
                </label>

                {/* Quick resize presets */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {[
                    { label: "元のサイズ", factor: 1 },
                    { label: "50%", factor: 0.5 },
                    { label: "25%", factor: 0.25 },
                    { label: "200%", factor: 2 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        if (originalDimensions) {
                          setResizeWidth(Math.round(originalDimensions.width * preset.factor));
                          setResizeHeight(Math.round(originalDimensions.height * preset.factor));
                        }
                      }}
                      className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          {(processingState.status === "processing" || isProcessing) && (
            <div className="mb-8">
              <ProgressBar
                progress={processingState.progress || 50}
                message={processingState.message || "処理中..."}
              />
            </div>
          )}

          {/* Actions */}
          {selectedFile && (
            <div className="flex gap-4">
              {mode === "video" ? (
                <>
                  <Button
                    variant="primary"
                    onClick={handleConvertVideo}
                    isLoading={isLoading || processingState.status === "processing"}
                    disabled={!ffmpegLoaded && !isLoading}
                    className="flex-1 !py-4 bg-gradient-to-r from-blue-600 to-purple-600"
                  >
                    {isLoading && !ffmpegLoaded
                      ? "FFmpegを読み込み中..."
                      : `${videoOptions.format.toUpperCase()}に変換`}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleExtractAudio}
                    disabled={isLoading || processingState.status === "processing"}
                    className="!py-4"
                  >
                    音声抽出
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleConvertImage}
                  isLoading={isProcessing}
                  className="flex-1 !py-4 bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  {imageFormat.toUpperCase()}に変換
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                ブラウザ内処理について
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
                全ての処理はお使いのブラウザ内で行われます。ファイルがサーバーにアップロードされることはありません。
                {mode === "video" && " 処理中はブラウザのタブを閉じないでください。"}
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
