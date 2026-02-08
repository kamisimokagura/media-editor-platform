"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useImageProcessor } from "@/hooks/useImageProcessor";
import { Button, Slider, DropZone, ProgressBar, Modal } from "@/components/ui";
import { toast } from "@/stores/toastStore";
import { v4 as uuidv4 } from "uuid";
// TODO: Re-enable when CDN-based loading is implemented (heic2any/libraw-wasm cause Turbopack build hang)
// import { isHeicFile, ensureBrowserCompatibleImage } from "@/lib/heicConverter";
// import { isRawFile, ensureBrowserCompatibleRawImage } from "@/lib/rawConverter";
import type { MediaFile } from "@/types";

type EditorTab = "adjust" | "crop" | "resize" | "filters" | "ai";
type CropAspectRatio = "free" | "1:1" | "4:3" | "16:9" | "9:16" | "3:2";

// Preset filters configuration
const PRESET_FILTERS = [
  { id: "none", name: "オリジナル", adjustments: {} },
  { id: "vintage", name: "ビンテージ", adjustments: { brightness: -5, contrast: 10, saturation: -30, exposure: -10 } },
  { id: "bw", name: "モノクロ", adjustments: { saturation: -100 } },
  { id: "warm", name: "ウォーム", adjustments: { brightness: 5, saturation: 20, exposure: 5 } },
  { id: "cool", name: "クール", adjustments: { brightness: -5, saturation: -10, contrast: 10 } },
  { id: "dramatic", name: "ドラマチック", adjustments: { contrast: 30, saturation: -20, shadows: -20, highlights: 20 } },
  { id: "fade", name: "フェード", adjustments: { contrast: -20, brightness: 10, saturation: -20 } },
  { id: "vivid", name: "ビビッド", adjustments: { saturation: 40, contrast: 20 } },
  { id: "sepia", name: "セピア", adjustments: { saturation: -80, brightness: 5 } },
  { id: "hdr", name: "HDR風", adjustments: { contrast: 25, saturation: 15, highlights: -30, shadows: 30, sharpness: 20 } },
];

export function ImageEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropOverlayRef = useRef<HTMLDivElement>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>("adjust");
  const [showExportModal, setShowExportModal] = useState(false);

  // Export settings
  const [exportFormat, setExportFormat] = useState<"png" | "jpg" | "webp" | "gif" | "avif" | "bmp">("webp");
  const [exportQuality, setExportQuality] = useState(90);
  const [exportWidth, setExportWidth] = useState(0);
  const [exportHeight, setExportHeight] = useState(0);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);

  // Crop state
  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [cropAspectRatio, setCropAspectRatio] = useState<CropAspectRatio>("free");
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [cropDragStart, setCropDragStart] = useState({ x: 0, y: 0 });

  // Resize state
  const [resizeWidth, setResizeWidth] = useState(0);
  const [resizeHeight, setResizeHeight] = useState(0);
  const [resizeMaintainAspect, setResizeMaintainAspect] = useState(true);

  const {
    currentImage,
    setCurrentImage,
    imageAdjustments,
    setImageAdjustments,
    resetImageAdjustments,
    processingState,
    addMediaFile,
    originalImageData,
  } = useEditorStore();

  const { initCanvas, applyAdjustments, exportImage, resizeImage, cropImage } = useImageProcessor();

  // Handle file selection
  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      let file = files[0];
      if (!file) {
        toast.error("画像ファイルを選択してください");
        return;
      }

      // TODO: Re-enable HEIC/RAW support when CDN-based loading is implemented
      // if (isHeicFile(file)) {
      //   toast.info("HEIC画像を変換中...");
      //   file = await ensureBrowserCompatibleImage(file);
      // } else if (isRawFile(file)) {
      //   toast.info("RAW画像を変換中...");
      //   file = await ensureBrowserCompatibleRawImage(file);
      // } else
      if (!file.type.startsWith("image/")) {
        toast.error("画像ファイルを選択してください");
        return;
      }

      const url = URL.createObjectURL(file);

      const img = new Image();
      img.onload = () => {
        const mediaFile: MediaFile = {
          id: uuidv4(),
          name: file.name,
          type: "image",
          mimeType: file.type,
          size: file.size,
          url,
          blob: file,
          width: img.naturalWidth,
          height: img.naturalHeight,
          createdAt: new Date(),
        };

        addMediaFile(mediaFile);
        setCurrentImage(mediaFile);
        setImageLoaded(false);
        setExportWidth(img.naturalWidth);
        setExportHeight(img.naturalHeight);
        setResizeWidth(img.naturalWidth);
        setResizeHeight(img.naturalHeight);
      };
      img.src = url;
    },
    [addMediaFile, setCurrentImage]
  );

  // Initialize canvas when image loads
  useEffect(() => {
    if (currentImage && imageRef.current && canvasRef.current && !imageLoaded) {
      const img = imageRef.current;

      if (img.complete && img.naturalWidth > 0) {
        initCanvas(canvasRef.current, img);
        setImageLoaded(true);
        setCropRect({ x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight });
      }
    }
  }, [currentImage, imageLoaded, initCanvas]);

  // Apply adjustments when they change
  useEffect(() => {
    if (imageLoaded) {
      applyAdjustments(imageAdjustments);
    }
  }, [imageAdjustments, imageLoaded, applyAdjustments]);

  // Update export dimensions when image changes
  useEffect(() => {
    if (originalImageData) {
      setExportWidth(originalImageData.width);
      setExportHeight(originalImageData.height);
      setResizeWidth(originalImageData.width);
      setResizeHeight(originalImageData.height);
    }
  }, [originalImageData]);

  // Handle export dimension change with aspect ratio
  const handleExportWidthChange = (newWidth: number) => {
    setExportWidth(newWidth);
    if (maintainAspectRatio && originalImageData) {
      const ratio = originalImageData.height / originalImageData.width;
      setExportHeight(Math.round(newWidth * ratio));
    }
  };

  const handleExportHeightChange = (newHeight: number) => {
    setExportHeight(newHeight);
    if (maintainAspectRatio && originalImageData) {
      const ratio = originalImageData.width / originalImageData.height;
      setExportWidth(Math.round(newHeight * ratio));
    }
  };

  // Handle resize dimension change
  const handleResizeWidthChange = (newWidth: number) => {
    setResizeWidth(newWidth);
    if (resizeMaintainAspect && originalImageData) {
      const ratio = originalImageData.height / originalImageData.width;
      setResizeHeight(Math.round(newWidth * ratio));
    }
  };

  const handleResizeHeightChange = (newHeight: number) => {
    setResizeHeight(newHeight);
    if (resizeMaintainAspect && originalImageData) {
      const ratio = originalImageData.width / originalImageData.height;
      setResizeWidth(Math.round(newHeight * ratio));
    }
  };

  // Apply resize
  const handleApplyResize = async () => {
    await resizeImage(resizeWidth, resizeHeight, false);
    applyAdjustments(imageAdjustments);
  };

  // Apply preset filter
  const handleApplyFilter = (filter: typeof PRESET_FILTERS[0]) => {
    if (filter.id === "none") {
      resetImageAdjustments();
    } else {
      setImageAdjustments({
        ...imageAdjustments,
        ...filter.adjustments,
      });
    }
    toast.success(`${filter.name}フィルターを適用しました`);
  };

  // Handle crop
  const handleCropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cropMode || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDraggingCrop(true);
    setCropDragStart({ x, y });
    setCropRect({ x, y, width: 0, height: 0 });
  };

  const handleCropMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingCrop || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    let width = currentX - cropDragStart.x;
    let height = currentY - cropDragStart.y;

    // Handle aspect ratio constraints
    if (cropAspectRatio !== "free") {
      const ratios: Record<CropAspectRatio, number> = {
        "free": 1,
        "1:1": 1,
        "4:3": 4/3,
        "16:9": 16/9,
        "9:16": 9/16,
        "3:2": 3/2,
      };
      const ratio = ratios[cropAspectRatio];
      height = width / ratio;
    }

    setCropRect({
      x: width > 0 ? cropDragStart.x : cropDragStart.x + width,
      y: height > 0 ? cropDragStart.y : cropDragStart.y + height,
      width: Math.abs(width),
      height: Math.abs(height),
    });
  };

  const handleCropMouseUp = () => {
    setIsDraggingCrop(false);
  };

  const handleApplyCrop = async () => {
    if (cropRect.width > 10 && cropRect.height > 10) {
      await cropImage(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
      setCropMode(false);
      applyAdjustments(imageAdjustments);
    } else {
      toast.error("クロップ範囲を選択してください");
    }
  };

  // Handle export
  const handleExport = async () => {
    // If dimensions changed, resize first
    if (originalImageData &&
        (exportWidth !== originalImageData.width || exportHeight !== originalImageData.height)) {
      await resizeImage(exportWidth, exportHeight, false);
    }

    const blob = await exportImage(exportFormat === "gif" ? "png" : exportFormat, exportQuality / 100);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = exportFormat === "jpg" ? "jpg" : exportFormat;
      a.download = `edited_${Date.now()}.${extension}`;
      a.click();
      URL.revokeObjectURL(url);
      setShowExportModal(false);

      // Restore original size if changed
      if (originalImageData &&
          (exportWidth !== originalImageData.width || exportHeight !== originalImageData.height)) {
        await resizeImage(originalImageData.width, originalImageData.height, false);
      }
    }
  };

  // Quick export
  const handleQuickExport = async (format: "png" | "jpg" | "webp") => {
    const blob = await exportImage(format);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `edited_${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Adjustment controls configuration
  const adjustmentControls = [
    { key: "brightness", label: "明るさ", min: -100, max: 100 },
    { key: "contrast", label: "コントラスト", min: -100, max: 100 },
    { key: "saturation", label: "彩度", min: -100, max: 100 },
    { key: "exposure", label: "露出", min: -100, max: 100 },
    { key: "highlights", label: "ハイライト", min: -100, max: 100 },
    { key: "shadows", label: "シャドウ", min: -100, max: 100 },
    { key: "sharpness", label: "シャープネス", min: 0, max: 100 },
    { key: "blur", label: "ぼかし", min: 0, max: 100 },
  ];

  // Tab configuration
  const tabs: { id: EditorTab; label: string; icon: React.ReactNode }[] = [
    { id: "adjust", label: "調整", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    )},
    { id: "crop", label: "クロップ", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )},
    { id: "resize", label: "リサイズ", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
    )},
    { id: "filters", label: "フィルター", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    )},
    { id: "ai", label: "AI機能", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    )},
  ];

  // Estimate file size
  const estimateFileSize = () => {
    if (!originalImageData) return "---";
    const pixels = exportWidth * exportHeight;
    let size: number;

    switch (exportFormat) {
      case "png":
        size = pixels * 3 * 0.5;
        break;
      case "jpg":
        size = pixels * 3 * (exportQuality / 100) * 0.3;
        break;
      case "webp":
        size = pixels * 3 * (exportQuality / 100) * 0.2;
        break;
      case "avif":
        size = pixels * 3 * (exportQuality / 100) * 0.15;
        break;
      case "bmp":
        size = pixels * 3;
        break;
      case "gif":
        size = pixels * 0.5;
        break;
      default:
        size = pixels * 3;
    }

    if (size > 1024 * 1024) {
      return `約 ${(size / 1024 / 1024).toFixed(1)} MB`;
    }
    return `約 ${(size / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="h-full flex bg-gray-50 dark:bg-dark-950">
      {/* Main canvas area */}
      <div className="flex-1 flex flex-col">
        {/* Canvas - centered with proper spacing */}
        <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-dark-900 p-6 lg:p-10 overflow-auto">
          {currentImage ? (
            <div
              className="relative"
              onMouseDown={handleCropMouseDown}
              onMouseMove={handleCropMouseMove}
              onMouseUp={handleCropMouseUp}
              onMouseLeave={handleCropMouseUp}
            >
              {/* Hidden image for loading */}
              <img
                ref={imageRef}
                src={currentImage.url}
                alt={currentImage.name}
                className="hidden"
                onLoad={() => {
                  if (canvasRef.current && imageRef.current) {
                    initCanvas(canvasRef.current, imageRef.current);
                    setImageLoaded(true);
                  }
                }}
              />

              {/* Main canvas */}
              <canvas
                ref={canvasRef}
                className={`max-w-full max-h-[70vh] rounded-lg shadow-lg ${cropMode ? "cursor-crosshair" : ""}`}
              />

              {/* Crop overlay */}
              {cropMode && cropRect.width > 0 && cropRect.height > 0 && canvasRef.current && (
                <div
                  ref={cropOverlayRef}
                  className="absolute border-2 border-white border-dashed bg-black/30 pointer-events-none"
                  style={{
                    left: `${(cropRect.x / canvasRef.current.width) * 100}%`,
                    top: `${(cropRect.y / canvasRef.current.height) * 100}%`,
                    width: `${(cropRect.width / canvasRef.current.width) * 100}%`,
                    height: `${(cropRect.height / canvasRef.current.height) * 100}%`,
                  }}
                >
                  {/* Corner handles */}
                  <div className="absolute -top-1 -left-1 w-3 h-3 bg-white rounded-full" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full" />
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white rounded-full" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full" />
                </div>
              )}

              {/* Loading overlay */}
              {processingState.status === "processing" && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <div className="bg-white dark:bg-dark-800 p-4 rounded-lg">
                    <ProgressBar
                      progress={processingState.progress}
                      message={processingState.message}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <DropZone
              onFilesSelected={handleFilesSelected}
              accept="image"
              multiple={false}
              className="w-full max-w-lg"
            />
          )}
        </div>

        {/* Bottom toolbar - improved spacing */}
        {currentImage && (
          <div className="bg-white dark:bg-dark-800 border-t border-gray-200 dark:border-dark-700 p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Rotation controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setImageAdjustments({
                        rotation: (imageAdjustments.rotation - 90 + 360) % 360,
                      })
                    }
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                    title="左に回転"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                  <button
                    onClick={() =>
                      setImageAdjustments({
                        rotation: (imageAdjustments.rotation + 90) % 360,
                      })
                    }
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                    title="右に回転"
                  >
                    <svg className="w-5 h-5 transform scale-x-[-1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                </div>

                {/* Flip controls */}
                <div className="flex items-center gap-2 border-l border-gray-200 dark:border-dark-700 pl-4">
                  <button
                    onClick={() =>
                      setImageAdjustments({
                        flipHorizontal: !imageAdjustments.flipHorizontal,
                      })
                    }
                    className={`p-2 rounded-lg transition-colors ${
                      imageAdjustments.flipHorizontal
                        ? "bg-primary-100 text-primary-600 dark:bg-primary-900/20"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700"
                    }`}
                    title="水平反転"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                  <button
                    onClick={() =>
                      setImageAdjustments({
                        flipVertical: !imageAdjustments.flipVertical,
                      })
                    }
                    className={`p-2 rounded-lg transition-colors ${
                      imageAdjustments.flipVertical
                        ? "bg-primary-100 text-primary-600 dark:bg-primary-900/20"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700"
                    }`}
                    title="垂直反転"
                  >
                    <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                </div>

                {/* New image button */}
                <div className="border-l border-gray-200 dark:border-dark-700 pl-4">
                  <button
                    onClick={() => {
                      setCurrentImage(null);
                      setImageLoaded(false);
                      resetImageAdjustments();
                    }}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                    title="新しい画像"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Export buttons */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={resetImageAdjustments}>
                  リセット
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleQuickExport("png")}>
                  PNG
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleQuickExport("jpg")}>
                  JPG
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleQuickExport("webp")}>
                  WebP
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowExportModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  詳細エクスポート
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Side panel - improved width and spacing */}
      {currentImage && (
        <div className="w-80 lg:w-96 bg-white dark:bg-dark-800 border-l border-gray-200 dark:border-dark-700 flex flex-col shadow-xl">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-dark-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === "crop") {
                    setCropMode(true);
                  } else {
                    setCropMode(false);
                  }
                }}
                className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/10"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content - improved padding */}
          <div className="flex-1 overflow-y-auto p-5 lg:p-6">
            {/* Adjust tab */}
            {activeTab === "adjust" && (
              <div className="space-y-6">
                {adjustmentControls.map(({ key, label, min, max }) => (
                  <Slider
                    key={key}
                    label={label}
                    min={min}
                    max={max}
                    value={imageAdjustments[key as keyof typeof imageAdjustments] as number}
                    unit=""
                    onChange={(e) =>
                      setImageAdjustments({
                        [key]: parseInt(e.target.value, 10),
                      })
                    }
                  />
                ))}
              </div>
            )}

            {/* Crop tab */}
            {activeTab === "crop" && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    アスペクト比
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {(["free", "1:1", "4:3", "16:9", "9:16", "3:2"] as CropAspectRatio[]).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setCropAspectRatio(ratio)}
                        className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                          cropAspectRatio === ratio
                            ? "bg-primary-600 text-white"
                            : "bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600"
                        }`}
                      >
                        {ratio === "free" ? "自由" : ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    画像上でドラッグして範囲を選択してください
                  </p>
                </div>

                {cropRect.width > 10 && cropRect.height > 10 && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <p>選択範囲: {Math.round(cropRect.width)} x {Math.round(cropRect.height)}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setCropMode(false);
                      setCropRect({ x: 0, y: 0, width: 0, height: 0 });
                    }}
                    className="flex-1"
                  >
                    キャンセル
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleApplyCrop}
                    className="flex-1"
                    disabled={cropRect.width < 10 || cropRect.height < 10}
                  >
                    適用
                  </Button>
                </div>
              </div>
            )}

            {/* Resize tab */}
            {activeTab === "resize" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    幅 (px)
                  </label>
                  <input
                    type="number"
                    value={resizeWidth}
                    onChange={(e) => handleResizeWidthChange(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    高さ (px)
                  </label>
                  <input
                    type="number"
                    value={resizeHeight}
                    onChange={(e) => handleResizeHeightChange(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resizeMaintainAspect}
                    onChange={(e) => setResizeMaintainAspect(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    縦横比を維持
                  </span>
                </label>

                {/* Quick resize presets */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    プリセット
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "50%", factor: 0.5 },
                      { label: "75%", factor: 0.75 },
                      { label: "150%", factor: 1.5 },
                      { label: "200%", factor: 2 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          if (originalImageData) {
                            setResizeWidth(Math.round(originalImageData.width * preset.factor));
                            setResizeHeight(Math.round(originalImageData.height * preset.factor));
                          }
                        }}
                        className="px-3 py-2 text-sm bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button variant="primary" onClick={handleApplyResize} className="w-full">
                  リサイズを適用
                </Button>
              </div>
            )}

            {/* Filters tab */}
            {activeTab === "filters" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {PRESET_FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => handleApplyFilter(filter)}
                      className="group relative overflow-hidden rounded-lg border-2 border-gray-200 dark:border-dark-600 hover:border-primary-500 dark:hover:border-primary-400 transition-colors"
                    >
                      <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 dark:from-dark-700 dark:to-dark-600 flex items-center justify-center">
                        <span className="text-2xl">
                          {filter.id === "none" ? "📷" :
                           filter.id === "vintage" ? "🎞️" :
                           filter.id === "bw" ? "⚫" :
                           filter.id === "warm" ? "🌅" :
                           filter.id === "cool" ? "❄️" :
                           filter.id === "dramatic" ? "🎭" :
                           filter.id === "fade" ? "🌫️" :
                           filter.id === "vivid" ? "🌈" :
                           filter.id === "sepia" ? "📜" :
                           "✨"}
                        </span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm py-1.5 px-2">
                        <span className="text-xs font-medium text-white">
                          {filter.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AI tab */}
            {activeTab === "ai" && (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="font-semibold text-purple-700 dark:text-purple-300">AI機能</span>
                  </div>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    AI機能は近日公開予定です。Pro以上のプランでご利用いただけます。
                  </p>
                </div>

                {/* AI feature cards */}
                {[
                  {
                    icon: "🔍",
                    title: "AI高画質化",
                    description: "画像を最大4倍に拡大し、ディテールを保持",
                    badge: "Pro",
                  },
                  {
                    icon: "✂️",
                    title: "背景削除",
                    description: "ワンクリックで背景を自動削除",
                    badge: "Pro",
                  },
                  {
                    icon: "🎨",
                    title: "カラー化",
                    description: "白黒写真を自然なカラーに変換",
                    badge: "Business",
                  },
                  {
                    icon: "🖼️",
                    title: "背景生成",
                    description: "AIで新しい背景を生成",
                    badge: "Business",
                  },
                  {
                    icon: "👤",
                    title: "顔補正",
                    description: "ポートレート写真を自動補正",
                    badge: "Pro",
                  },
                  {
                    icon: "🔧",
                    title: "オブジェクト削除",
                    description: "不要なオブジェクトを自動削除",
                    badge: "Business",
                  },
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="relative p-4 bg-gray-50 dark:bg-dark-700 rounded-xl border border-gray-200 dark:border-dark-600 opacity-60"
                  >
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        feature.badge === "Pro"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                      }`}>
                        {feature.badge}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{feature.icon}</span>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {feature.title}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 dark:bg-black/30 rounded-xl">
                      <span className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                ))}

                <Button
                  variant="primary"
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
                  onClick={() => toast.info("AI機能は近日公開予定です")}
                >
                  プランをアップグレード
                </Button>
              </div>
            )}
          </div>

          {/* Image info */}
          {currentImage && (
            <div className="p-4 border-t border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                画像情報
              </h4>
              <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <p className="truncate" title={currentImage.name}>
                  {currentImage.name}
                </p>
                <p>
                  {originalImageData ? `${originalImageData.width} x ${originalImageData.height}` : `${currentImage.width} x ${currentImage.height}`}
                </p>
                <p>{(currentImage.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="詳細エクスポート設定"
      >
        <div className="space-y-6">
          {/* Format selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              フォーマット
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(["png", "jpg", "webp", "avif", "bmp", "gif"] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => setExportFormat(format)}
                  className={`px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                    exportFormat === format
                      ? "bg-primary-600 text-white shadow-lg"
                      : "bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600"
                  }`}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {exportFormat === "png" && "可逆圧縮・透過対応。ロゴやイラストに最適"}
              {exportFormat === "jpg" && "高圧縮・写真向け。透過非対応"}
              {exportFormat === "webp" && "最新形式・高圧縮・透過対応。Web表示に最適"}
              {exportFormat === "avif" && "最新高圧縮形式。Chrome対応。最小ファイルサイズ"}
              {exportFormat === "bmp" && "非圧縮ビットマップ。互換性が高い"}
              {exportFormat === "gif" && "アニメーション対応。256色制限あり"}
            </p>
          </div>

          {/* Quality slider (not for PNG/BMP) */}
          {exportFormat !== "png" && exportFormat !== "bmp" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                品質: {exportQuality}%
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={exportQuality}
                onChange={(e) => setExportQuality(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-dark-600 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>小さいサイズ</span>
                <span>高品質</span>
              </div>
            </div>
          )}

          {/* Dimensions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              サイズ
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">幅 (px)</label>
                <input
                  type="number"
                  value={exportWidth}
                  onChange={(e) => handleExportWidthChange(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">高さ (px)</label>
                <input
                  type="number"
                  value={exportHeight}
                  onChange={(e) => handleExportHeightChange(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={maintainAspectRatio}
                onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                縦横比を維持
              </span>
            </label>
          </div>

          {/* Estimated file size */}
          <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">推定ファイルサイズ</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{estimateFileSize()}</span>
            </div>
          </div>

          {/* Export button */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowExportModal(false)}
              className="flex-1"
            >
              キャンセル
            </Button>
            <Button
              variant="primary"
              onClick={handleExport}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
            >
              ダウンロード
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
