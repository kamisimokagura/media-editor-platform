"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useRef, useEffect, useCallback, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useImageProcessor } from "@/hooks/useImageProcessor";
import { Button, DropZone, ProgressBar } from "@/components/ui";
import { toast } from "@/stores/toastStore";
import { v4 as uuidv4 } from "uuid";
import { isHeicFile, ensureBrowserCompatibleImage } from "@/lib/heicConverter";
import { isRawFile, ensureBrowserCompatibleRawImage } from "@/lib/rawConverter";
import { ANALYTICS_EVENTS, trackClientEvent } from "@/lib/analytics/client";
import type { MediaFile } from "@/types";

import { type EditorTab, type FilterCategory, type PresetFilter } from "./constants/filters";
import { useMosaic } from "./hooks/useMosaic";
import { useCrop } from "./hooks/useCrop";
import { useExportSettings } from "./hooks/useExportSettings";
import { TabContent, type TabContentProps } from "./panels/TabContent";
import { ExportModal } from "./ExportModal";

interface ImageEditorProps {
  initialTab?: EditorTab;
  autoOpenExport?: boolean;
}

// Tab icons
const TAB_ICONS: Record<EditorTab, React.ReactNode> = {
  adjust: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  ),
  crop: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  resize: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  ),
  filters: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
  tools: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

const TABS: { id: EditorTab; label: string }[] = [
  { id: "adjust", label: "調整" },
  { id: "crop", label: "クロップ" },
  { id: "resize", label: "リサイズ" },
  { id: "filters", label: "フィルター" },
  { id: "tools", label: "ツール" },
];

export function ImageEditor({
  initialTab = "adjust",
  autoOpenExport = false,
}: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropOverlayRef = useRef<HTMLDivElement>(null);
  const autoExportOpenedRef = useRef(false);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>(initialTab);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  // Filter state
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [filterIntensity, setFilterIntensity] = useState(100);

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
    fullResetImage,
    undoImageAdjustment,
    processingState,
    addMediaFile,
    mediaFiles,
    originalImageData,
    historyIndex,
  } = useEditorStore();

  const { initCanvas, applyAdjustments, exportImage, resizeImage, cropImage } = useImageProcessor();
  const imageFiles = mediaFiles.filter((file) => file.type === "image");

  // Canvas coordinate helper
  const getCanvasCoordinates = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      scaleX,
      scaleY,
    };
  }, []);

  // Custom hooks
  const mosaic = useMosaic({ canvasRef, getCanvasCoordinates });
  const crop = useCrop({
    getCanvasCoordinates,
    imageAdjustments,
    applyAdjustments,
    cropImage,
  });
  const exportSettings = useExportSettings({ exportImage, resizeImage });

  // ─── File handling ──────────────────────────────────

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (!files.length) {
        toast.error("画像ファイルを選択してください");
        return;
      }

      const uploadedImages: MediaFile[] = [];

      for (const rawFile of files) {
        let file = rawFile;

        if (isHeicFile(file)) {
          toast.info(`${file.name}: HEIC変換中...`);
          file = await ensureBrowserCompatibleImage(file);
        } else if (isRawFile(file)) {
          toast.info(`${file.name}: RAW変換中...`);
          file = await ensureBrowserCompatibleRawImage(file);
        } else if (!file.type.startsWith("image/")) {
          toast.error(`${file.name}: 画像ファイルを選択してください`);
          continue;
        }

        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;

        const loaded = await new Promise<boolean>((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
        });

        if (!loaded) {
          URL.revokeObjectURL(url);
          toast.error(`${file.name}: 読み込みに失敗しました`);
          continue;
        }

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
        uploadedImages.push(mediaFile);

        void trackClientEvent({
          eventName: ANALYTICS_EVENTS.FILE_SELECTED,
          eventParams: {
            media_type: "image",
            mime_type: file.type,
            file_name: file.name,
            file_size_bytes: file.size,
          },
        });
      }

      if (!uploadedImages.length) {
        toast.error("画像ファイルを読み込めませんでした");
        return;
      }

      const firstImage = uploadedImages[0];
      setCurrentImage(firstImage);
      setImageLoaded(false);
      exportSettings.setExportWidth(firstImage.width || 0);
      exportSettings.setExportHeight(firstImage.height || 0);
      setResizeWidth(firstImage.width || 0);
      setResizeHeight(firstImage.height || 0);

      if (uploadedImages.length > 1) {
        toast.success(`${uploadedImages.length}枚を追加しました。編集は1枚ずつ切り替えて行えます。`);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addMediaFile, setCurrentImage]
  );

  const handleSelectImage = useCallback(
    (image: MediaFile) => {
      if (currentImage?.id === image.id) return;
      setCurrentImage(image);
      setImageLoaded(false);
      setIsMobilePanelOpen(false);
    },
    [currentImage?.id, setCurrentImage]
  );

  // ─── Effects ────────────────────────────────────────

  useEffect(() => {
    if (currentImage && imageRef.current && canvasRef.current && !imageLoaded) {
      const img = imageRef.current;
      if (img.complete && img.naturalWidth > 0) {
        initCanvas(canvasRef.current, img);
        setImageLoaded(true);
        crop.setCropRect({ x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentImage, imageLoaded, initCanvas]);

  useEffect(() => {
    if (imageLoaded) applyAdjustments(imageAdjustments);
  }, [imageAdjustments, imageLoaded, applyAdjustments]);

  useEffect(() => {
    if (originalImageData) {
      exportSettings.setExportWidth(originalImageData.width);
      exportSettings.setExportHeight(originalImageData.height);
      setResizeWidth(originalImageData.width);
      setResizeHeight(originalImageData.height);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalImageData]);

  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  useEffect(() => {
    crop.setCropMode(activeTab === "crop");
    if (activeTab !== "tools") {
      mosaic.setMosaicMode(false);
      mosaic.setMosaicDrawingState(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    const closeMobilePanelOnDesktop = () => {
      if (window.innerWidth >= 768) setIsMobilePanelOpen(false);
    };
    closeMobilePanelOnDesktop();
    window.addEventListener("resize", closeMobilePanelOnDesktop);
    return () => window.removeEventListener("resize", closeMobilePanelOnDesktop);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoImageAdjustment();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoImageAdjustment]);

  useEffect(() => {
    if (!autoOpenExport) return;
    if (!currentImage) { autoExportOpenedRef.current = false; return; }
    if (!autoExportOpenedRef.current) {
      exportSettings.setShowExportModal(true);
      autoExportOpenedRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenExport, currentImage]);

  // ─── Handlers ───────────────────────────────────────

  const handleResizeWidthChange = (newWidth: number) => {
    setResizeWidth(newWidth);
    if (resizeMaintainAspect && originalImageData) {
      setResizeHeight(Math.round(newWidth * (originalImageData.height / originalImageData.width)));
    }
  };

  const handleResizeHeightChange = (newHeight: number) => {
    setResizeHeight(newHeight);
    if (resizeMaintainAspect && originalImageData) {
      setResizeWidth(Math.round(newHeight * (originalImageData.width / originalImageData.height)));
    }
  };

  const handleApplyResize = async () => {
    await resizeImage(resizeWidth, resizeHeight, false);
    applyAdjustments(imageAdjustments);
  };

  const handleFullReset = () => {
    fullResetImage();
    crop.setCropRect({ x: 0, y: 0, width: 0, height: 0 });
    mosaic.cancelMosaic();
  };

  const handleApplyFilter = (filter: PresetFilter) => {
    if (filter.id === "none") {
      resetImageAdjustments();
    } else {
      const intensity = filterIntensity / 100;
      const scaledAdjustments: Record<string, number> = {};
      for (const [key, value] of Object.entries(filter.adjustments)) {
        scaledAdjustments[key] = Math.round(value * intensity);
      }
      setImageAdjustments({ ...imageAdjustments, ...scaledAdjustments });
    }
    toast.success(`${filter.name}フィルターを適用しました`);
  };

  // ─── Shared tab content props ───────────────────────

  const tabContentProps: Omit<TabContentProps, "activeTab" | "variant" | "onCloseMobilePanel"> = {
    imageAdjustments,
    setImageAdjustments,
    cropAspectRatio: crop.cropAspectRatio,
    setCropAspectRatio: crop.setCropAspectRatio,
    cropRect: crop.cropRect,
    onApplyCrop: crop.handleApplyCrop,
    onCancelCrop: crop.cancelCrop,
    resizeWidth,
    resizeHeight,
    resizeMaintainAspect,
    originalImageData,
    onResizeWidthChange: handleResizeWidthChange,
    onResizeHeightChange: handleResizeHeightChange,
    onMaintainAspectChange: setResizeMaintainAspect,
    onApplyResize: handleApplyResize,
    filterCategory,
    setFilterCategory,
    filterIntensity,
    setFilterIntensity,
    onApplyFilter: handleApplyFilter,
    mosaicMode: mosaic.mosaicMode,
    mosaicBlockSize: mosaic.mosaicBlockSize,
    mosaicBrushSize: mosaic.mosaicBrushSize,
    onSetMosaicMode: mosaic.setMosaicMode,
    onSetMosaicBlockSize: mosaic.setMosaicBlockSize,
    onSetMosaicBrushSize: mosaic.setMosaicBrushSize,
    onApplyMosaic: mosaic.applyMosaic,
    onCancelMosaic: mosaic.cancelMosaic,
  };

  // ─── Render ─────────────────────────────────────────

  const renderTabBar = (variant: "desktop" | "mobile") => (
    <div className={`flex border-b border-gray-200 dark:border-dark-700 ${variant === "mobile" ? "px-2" : ""}`}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium transition-colors ${
            activeTab === tab.id
              ? "text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/10"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700"
          }`}
        >
          {TAB_ICONS[tab.id]}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="h-full flex flex-col md:flex-row bg-gray-50 dark:bg-dark-950">
      {/* Main canvas area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-dark-900 p-3 sm:p-6 lg:p-10 overflow-auto">
          {currentImage ? (
            <div
              className="relative inline-block"
              onMouseDown={!mosaic.mosaicMode ? crop.handleCropMouseDown : undefined}
              onMouseMove={!mosaic.mosaicMode ? crop.handleCropMouseMove : undefined}
              onMouseUp={!mosaic.mosaicMode ? crop.handleCropMouseUp : undefined}
              onMouseLeave={!mosaic.mosaicMode ? crop.handleCropMouseUp : undefined}
              onTouchStart={!mosaic.mosaicMode ? crop.handleCropTouchStart : undefined}
              onTouchMove={!mosaic.mosaicMode ? crop.handleCropTouchMove : undefined}
              onTouchEnd={!mosaic.mosaicMode ? crop.handleCropMouseUp : undefined}
              onTouchCancel={!mosaic.mosaicMode ? crop.handleCropMouseUp : undefined}
              style={crop.cropMode ? { touchAction: "none" } : undefined}
            >
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

              <canvas
                ref={canvasRef}
                className={`max-w-full max-h-[50vh] sm:max-h-[60vh] md:max-h-[70vh] rounded-lg shadow-lg ${crop.cropMode ? "cursor-crosshair" : ""} ${mosaic.mosaicMode ? "cursor-crosshair" : ""}`}
                onPointerDown={mosaic.handleMosaicPointerDown}
                onPointerMove={mosaic.handleMosaicPointerMove}
                onPointerUp={mosaic.handleMosaicPointerEnd}
                onPointerLeave={mosaic.handleMosaicPointerEnd}
                onPointerCancel={mosaic.handleMosaicPointerEnd}
                style={{ touchAction: mosaic.mosaicMode ? "none" : "auto" }}
              />

              <canvas
                ref={mosaic.mosaicCanvasRef}
                className={`absolute inset-0 w-full h-full rounded-lg pointer-events-none ${mosaic.mosaicMode ? "opacity-40" : "opacity-0"}`}
              />

              {/* Crop overlay */}
              {crop.cropMode && crop.cropRect.width > 0 && crop.cropRect.height > 0 && originalImageData && (
                <div
                  ref={cropOverlayRef}
                  className="absolute border-2 border-white border-dashed bg-black/30 pointer-events-none"
                  style={{
                    left: `${(crop.cropRect.x / originalImageData.width) * 100}%`,
                    top: `${(crop.cropRect.y / originalImageData.height) * 100}%`,
                    width: `${(crop.cropRect.width / originalImageData.width) * 100}%`,
                    height: `${(crop.cropRect.height / originalImageData.height) * 100}%`,
                  }}
                >
                  <div className="absolute -top-1 -left-1 w-3 h-3 bg-white rounded-full" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full" />
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white rounded-full" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full" />
                </div>
              )}

              {mosaic.mosaicMode && (
                <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg z-10">
                  モザイク描画中 — 塗りつぶした箇所がモザイクになります
                </div>
              )}

              {processingState.status === "processing" && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <div className="bg-white dark:bg-dark-800 p-4 rounded-lg">
                    <ProgressBar progress={processingState.progress} message={processingState.message} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <DropZone onFilesSelected={handleFilesSelected} accept="image" multiple={true} maxFiles={30} className="w-full max-w-lg" />
          )}
        </div>

        {/* Image queue */}
        {currentImage && imageFiles.length > 1 && (
          <div className="bg-white dark:bg-dark-800 border-t border-gray-200 dark:border-dark-700 px-3 sm:px-5 lg:px-6 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">画像キュー ({imageFiles.length}枚)</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">編集対象: {currentImage.name}</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {imageFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => handleSelectImage(file)}
                  className={`flex items-center gap-2 min-w-[180px] p-2 rounded-xl border transition-colors ${
                    currentImage.id === file.id
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                      : "border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 hover:border-primary-400"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 dark:bg-dark-600 flex-shrink-0">
                    {file.url ? (
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs">IMG</div>
                    )}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate" title={file.name}>{file.name}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {file.width && file.height ? `${file.width}x${file.height}` : "画像"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom toolbar */}
        {currentImage && (
          <div className="bg-white dark:bg-dark-800 border-t border-gray-200 dark:border-dark-700 p-3 sm:p-5 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Rotation */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => setImageAdjustments({ rotation: (imageAdjustments.rotation - 90 + 360) % 360 })}
                    className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                    title="左に回転"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setImageAdjustments({ rotation: (imageAdjustments.rotation + 90) % 360 })}
                    className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                    title="右に回転"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 transform scale-x-[-1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                </div>

                {/* Flip */}
                <div className="flex items-center gap-1 sm:gap-2 border-l border-gray-200 dark:border-dark-700 pl-2 sm:pl-4">
                  <button
                    onClick={() => setImageAdjustments({ flipHorizontal: !imageAdjustments.flipHorizontal })}
                    className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                      imageAdjustments.flipHorizontal
                        ? "bg-primary-100 text-primary-600 dark:bg-primary-900/20"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700"
                    }`}
                    title="水平反転"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setImageAdjustments({ flipVertical: !imageAdjustments.flipVertical })}
                    className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                      imageAdjustments.flipVertical
                        ? "bg-primary-100 text-primary-600 dark:bg-primary-900/20"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700"
                    }`}
                    title="垂直反転"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                </div>

                {/* New image */}
                <div className="border-l border-gray-200 dark:border-dark-700 pl-2 sm:pl-4">
                  <button
                    onClick={() => { setCurrentImage(null); setImageLoaded(false); resetImageAdjustments(); }}
                    className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                    title="新しい画像"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {/* Mobile: open editing panel */}
                <div className="md:hidden border-l border-gray-200 dark:border-dark-700 pl-2">
                  <button
                    onClick={() => setIsMobilePanelOpen(true)}
                    className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                    title="編集パネルを開く"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Export buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button variant="ghost" size="sm" onClick={undoImageAdjustment} disabled={historyIndex <= 0} title="1つ前に戻す (Ctrl+Z)">
                  <svg className="w-4 h-4 sm:mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  <span className="hidden sm:inline">戻す</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleFullReset}>
                  <span className="hidden sm:inline">リセット</span>
                  <span className="sm:hidden text-xs">Reset</span>
                </Button>
                <div className="hidden sm:flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => exportSettings.handleQuickExport("png")}>PNG</Button>
                  <Button variant="secondary" size="sm" onClick={() => exportSettings.handleQuickExport("jpg")}>JPG</Button>
                  <Button variant="secondary" size="sm" onClick={() => exportSettings.handleQuickExport("webp")}>WebP</Button>
                </div>
                <Button variant="primary" size="sm" onClick={() => exportSettings.setShowExportModal(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
                  <span className="hidden sm:inline">詳細エクスポート</span>
                  <span className="sm:hidden text-xs">保存</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Side panel */}
      {currentImage && (
        <>
          {/* Desktop sidebar */}
          <div className="hidden md:flex w-80 lg:w-96 bg-white dark:bg-dark-800 border-l border-gray-200 dark:border-dark-700 flex-col shadow-xl">
            {renderTabBar("desktop")}
            <div className="flex-1 overflow-y-auto p-5 lg:p-6">
              <TabContent activeTab={activeTab} variant="desktop" {...tabContentProps} />
            </div>
            {/* Image info */}
            <div className="p-4 border-t border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">画像情報</h4>
              <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <p className="truncate" title={currentImage.name}>{currentImage.name}</p>
                <p>{originalImageData ? `${originalImageData.width} x ${originalImageData.height}` : `${currentImage.width} x ${currentImage.height}`}</p>
                <p>{(currentImage.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          </div>

          {/* Mobile bottom sheet */}
          {isMobilePanelOpen && (
            <div className="md:hidden fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobilePanelOpen(false)} />
              <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-dark-800 rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col animate-slide-up">
                <div className="flex items-center justify-center py-3">
                  <div className="w-10 h-1 bg-gray-300 dark:bg-dark-600 rounded-full" />
                </div>
                {renderTabBar("mobile")}
                <div className="flex-1 overflow-y-auto p-4 pb-8">
                  <TabContent
                    activeTab={activeTab}
                    variant="mobile"
                    {...tabContentProps}
                    onCloseMobilePanel={() => setIsMobilePanelOpen(false)}
                  />
                </div>
                <div className="p-3 border-t border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900 flex items-center justify-between">
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {currentImage.name} • {originalImageData ? `${originalImageData.width}x${originalImageData.height}` : `${currentImage.width}x${currentImage.height}`} • {(currentImage.size / 1024 / 1024).toFixed(1)}MB
                  </div>
                  <button onClick={() => setIsMobilePanelOpen(false)} className="ml-2 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-dark-700 rounded-lg">
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={exportSettings.showExportModal}
        onClose={() => exportSettings.setShowExportModal(false)}
        exportFormat={exportSettings.exportFormat}
        setExportFormat={exportSettings.setExportFormat}
        exportQuality={exportSettings.exportQuality}
        setExportQuality={exportSettings.setExportQuality}
        exportWidth={exportSettings.exportWidth}
        exportHeight={exportSettings.exportHeight}
        onExportWidthChange={exportSettings.handleExportWidthChange}
        onExportHeightChange={exportSettings.handleExportHeightChange}
        maintainAspectRatio={exportSettings.maintainAspectRatio}
        setMaintainAspectRatio={exportSettings.setMaintainAspectRatio}
        estimateFileSize={exportSettings.estimateFileSize}
        onExport={exportSettings.handleExport}
      />
    </div>
  );
}
