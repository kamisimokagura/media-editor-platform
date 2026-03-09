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
import {
  SlidersHorizontal,
  Crop,
  ArrowsOut,
  Palette,
  GearSix,
  Lightning,
  ArrowCounterClockwise,
  ArrowClockwise,
  ArrowsLeftRight,
  ArrowsDownUp,
  Plus,
  Minus,
  ArrowsOutCardinal,
  X,
  ChatCircle,
} from "@phosphor-icons/react";

import { type EditorTab, type FilterCategory, type PresetFilter } from "./constants/filters";
import { useMosaic } from "./hooks/useMosaic";
import { useCrop } from "./hooks/useCrop";
import { useExportSettings } from "./hooks/useExportSettings";
import { TabContent, type TabContentProps } from "./panels/TabContent";
import { ExportModal } from "./ExportModal";
import { useAIStore } from "@/stores/aiStore";
import { useAIFeature } from "@/hooks/useAIFeature";
import { ContextTaskbar, AIResultLayer, AIChatPanel } from "@/components/ai";

interface ImageEditorProps {
  initialTab?: EditorTab;
  autoOpenExport?: boolean;
}

// Tab icons
const TAB_ICONS: Record<EditorTab, React.ReactNode> = {
  adjust: <SlidersHorizontal size={20} weight="bold" />,
  crop: <Crop size={20} weight="bold" />,
  resize: <ArrowsOut size={20} weight="bold" />,
  filters: <Palette size={20} weight="bold" />,
  tools: <GearSix size={20} weight="bold" />,
  ai: <Lightning size={20} weight="bold" />,
};

const TABS: { id: EditorTab; label: string }[] = [
  { id: "adjust", label: "調整" },
  { id: "crop", label: "クロップ" },
  { id: "resize", label: "リサイズ" },
  { id: "filters", label: "フィルター" },
  { id: "tools", label: "ツール" },
  { id: "ai", label: "AI" },
];

export function ImageEditor({
  initialTab = "adjust",
  autoOpenExport = false,
}: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropOverlayRef = useRef<HTMLDivElement>(null);
  const autoExportOpenedRef = useRef(false);
  const adjustmentFrameRef = useRef<number | null>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>(initialTab);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [viewZoom, setViewZoom] = useState(1);
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  // Filter state
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [filterIntensity, setFilterIntensity] = useState(100);

  // Resize state
  const [resizeWidth, setResizeWidth] = useState(0);
  const [resizeHeight, setResizeHeight] = useState(0);
  const [resizeMaintainAspect, setResizeMaintainAspect] = useState(true);

  const currentImage = useEditorStore((state) => state.currentImage);
  const setCurrentImage = useEditorStore((state) => state.setCurrentImage);
  const imageAdjustments = useEditorStore((state) => state.imageAdjustments);
  const setImageAdjustments = useEditorStore((state) => state.setImageAdjustments);
  const resetImageAdjustments = useEditorStore((state) => state.resetImageAdjustments);
  const fullResetImage = useEditorStore((state) => state.fullResetImage);
  const undoImageAdjustment = useEditorStore((state) => state.undoImageAdjustment);
  const processingState = useEditorStore((state) => state.processingState);
  const addMediaFile = useEditorStore((state) => state.addMediaFile);
  const removeMediaFile = useEditorStore((state) => state.removeMediaFile);
  const clearAllMedia = useEditorStore((state) => state.clearAllMedia);
  const mediaFiles = useEditorStore((state) => state.mediaFiles);
  const originalImageData = useEditorStore((state) => state.originalImageData);
  const historyIndex = useEditorStore((state) => state.historyIndex);

  const { initCanvas, applyAdjustments, exportImage, resizeImage, cropImage } = useImageProcessor();
  const imageFiles = mediaFiles.filter((file) => file.type === "image");

  const { chatOpen, setChatOpen } = useAIStore();
  const { executeFeature } = useAIFeature();

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
      setViewZoom(1);
      setViewOffset({ x: 0, y: 0 });
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
    if (!imageLoaded) return;

    if (adjustmentFrameRef.current !== null) {
      window.cancelAnimationFrame(adjustmentFrameRef.current);
    }

    adjustmentFrameRef.current = window.requestAnimationFrame(() => {
      adjustmentFrameRef.current = null;
      applyAdjustments(imageAdjustments);
    });

    return () => {
      if (adjustmentFrameRef.current !== null) {
        window.cancelAnimationFrame(adjustmentFrameRef.current);
        adjustmentFrameRef.current = null;
      }
    };
  }, [imageAdjustments, imageLoaded, applyAdjustments]);

  useEffect(() => {
    return () => {
      if (adjustmentFrameRef.current !== null) {
        window.cancelAnimationFrame(adjustmentFrameRef.current);
      }
    };
  }, []);

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

  const handleAIFeatureSelect = useCallback((featureId: string) => {
    executeFeature(featureId, async () => {
      toast.info(`${featureId} の処理はAPIキー設定後に動作します`);
      return null;
    });
  }, [executeFeature]);

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
    onAIFeatureSelect: handleAIFeatureSelect,
  };

  // ─── Render ─────────────────────────────────────────

  const renderTabBar = (variant: "desktop" | "mobile") => (
    <div className={`flex border-b border-[var(--color-border)] ${variant === "mobile" ? "px-2" : ""}`}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium transition-colors ${
            activeTab === tab.id
              ? "text-[var(--color-accent-text)] border-b-2 border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-accent-soft)]"
          }`}
        >
          {TAB_ICONS[tab.id]}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="h-full flex flex-col md:flex-row bg-[var(--color-bg)]">
      {/* Main canvas area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div
          className="flex-1 flex items-center justify-center bg-[var(--color-bg)] overflow-hidden relative"
          onWheel={(e) => {
            if (!currentImage) return;
            e.preventDefault();
            const container = e.currentTarget;
            const rect = container.getBoundingClientRect();
            const cursorX = e.clientX - rect.left - rect.width / 2;
            const cursorY = e.clientY - rect.top - rect.height / 2;

            const oldZoom = viewZoom;
            const newZoom = Math.min(10, Math.max(0.1, oldZoom + (e.deltaY > 0 ? -0.15 : 0.15) * oldZoom));
            const scale = newZoom / oldZoom;

            setViewZoom(newZoom);
            setViewOffset((prev) => ({
              x: cursorX - scale * (cursorX - prev.x),
              y: cursorY - scale * (cursorY - prev.y),
            }));
          }}
          onPointerDown={(e) => {
            if (!currentImage) return;
            const target = e.target as HTMLElement;
            if (target.closest("button") || target.closest("[data-no-pan]")) return;
            const canPan = e.button === 1 || (e.button === 0 && !crop.cropMode && !mosaic.mosaicMode);
            if (!canPan) return;
            e.preventDefault();
            setIsPanning(true);
            panStartRef.current = { x: e.clientX, y: e.clientY, offsetX: viewOffset.x, offsetY: viewOffset.y };
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!isPanning) return;
            setViewOffset({
              x: panStartRef.current.offsetX + (e.clientX - panStartRef.current.x),
              y: panStartRef.current.offsetY + (e.clientY - panStartRef.current.y),
            });
          }}
          onPointerUp={(e) => {
            if (isPanning) {
              setIsPanning(false);
              (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
            }
          }}
        >
          {currentImage ? (
            <>
            <div
              className="relative inline-block transition-transform duration-75"
              onMouseDown={!mosaic.mosaicMode && !isPanning ? crop.handleCropMouseDown : undefined}
              onMouseMove={!mosaic.mosaicMode && !isPanning ? crop.handleCropMouseMove : undefined}
              onMouseUp={!mosaic.mosaicMode ? crop.handleCropMouseUp : undefined}
              onMouseLeave={!mosaic.mosaicMode ? crop.handleCropMouseUp : undefined}
              onTouchStart={!mosaic.mosaicMode ? crop.handleCropTouchStart : undefined}
              onTouchMove={!mosaic.mosaicMode ? crop.handleCropTouchMove : undefined}
              onTouchEnd={!mosaic.mosaicMode ? crop.handleCropMouseUp : undefined}
              onTouchCancel={!mosaic.mosaicMode ? crop.handleCropMouseUp : undefined}
              style={{
                ...(crop.cropMode ? { touchAction: "none" as const } : {}),
                transform: `translate(${viewOffset.x}px, ${viewOffset.y}px) scale(${viewZoom})`,
                cursor: isPanning ? "grabbing" : !crop.cropMode && !mosaic.mosaicMode ? "grab" : undefined,
              }}
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
                className={`max-w-full max-h-[80vh] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] ${crop.cropMode ? "cursor-crosshair" : ""} ${mosaic.mosaicMode ? "cursor-crosshair" : ""}`}
                onPointerDown={mosaic.handleMosaicPointerDown}
                onPointerMove={mosaic.handleMosaicPointerMove}
                onPointerUp={mosaic.handleMosaicPointerEnd}
                onPointerLeave={mosaic.handleMosaicPointerEnd}
                onPointerCancel={mosaic.handleMosaicPointerEnd}
                style={{ touchAction: mosaic.mosaicMode ? "none" : "auto" }}
              />

              <canvas
                ref={mosaic.mosaicCanvasRef}
                className={`absolute inset-0 w-full h-full rounded-[var(--radius-lg)] pointer-events-none ${mosaic.mosaicMode ? "opacity-40" : "opacity-0"}`}
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
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-[var(--radius-lg)]">
                  <div className="bg-[var(--color-surface)] p-4 rounded-[var(--radius-lg)]">
                    <ProgressBar progress={processingState.progress} message={processingState.message} />
                  </div>
                </div>
              )}

              <AIResultLayer
                onApply={(layerId) => toast.success(`Layer ${layerId} applied`)}
                onDiscard={(layerId) => toast.info(`Layer ${layerId} discarded`)}
              />
            </div>

            {/* Context Taskbar - overlay at bottom */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
              <ContextTaskbar
                hasImage={!!currentImage}
                onFeatureSelect={handleAIFeatureSelect}
              />
            </div>

            {/* Zoom controls */}
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-[var(--radius-md)] p-1">
              <button
                onClick={() => {
                  setViewZoom((prev) => Math.max(0.1, prev - 0.25));
                }}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
                title="縮小"
              >
                <Minus size={16} weight="bold" />
              </button>
              <button
                onClick={() => { setViewZoom(1); setViewOffset({ x: 0, y: 0 }); }}
                className="px-2 py-1 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors font-medium min-w-[3rem] text-center"
                title="リセット"
              >
                {Math.round(viewZoom * 100)}%
              </button>
              <button
                onClick={() => {
                  setViewZoom((prev) => Math.min(10, prev + 0.25));
                }}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
                title="拡大"
              >
                <Plus size={16} weight="bold" />
              </button>
              <button
                onClick={() => { setViewZoom(1); setViewOffset({ x: 0, y: 0 }); }}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors ml-0.5 border-l border-white/20 pl-1.5"
                title="表示リセット"
              >
                <ArrowsOutCardinal size={16} weight="bold" />
              </button>
            </div>
            </>
          ) : (
            <DropZone onFilesSelected={handleFilesSelected} accept="image" multiple={true} maxFiles={30} className="w-full max-w-lg" />
          )}
        </div>

        {/* Image queue */}
        {currentImage && imageFiles.length >= 1 && (
          <div className="bg-[var(--color-surface)] border-t border-[var(--color-border)] px-3 sm:px-5 lg:px-6 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm font-medium text-[var(--color-text-muted)]">ファイル一覧 ({imageFiles.length}枚)</p>
              <button
                onClick={() => {
                  clearAllMedia();
                  setImageLoaded(false);
                  resetImageAdjustments();
                }}
                className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
              >
                すべてクリア
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {imageFiles.map((file) => (
                <div
                  key={file.id}
                  className={`group/item relative flex items-center gap-2 min-w-[180px] p-2 rounded-[var(--radius-lg)] border transition-colors cursor-pointer ${
                    currentImage.id === file.id
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                      : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-accent)]"
                  }`}
                  onClick={() => handleSelectImage(file)}
                >
                  <div className="w-10 h-10 rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-border)] flex-shrink-0">
                    {file.url ? (
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)] text-xs">IMG</div>
                    )}
                  </div>
                  <div className="min-w-0 text-left flex-1">
                    <p className="text-xs font-medium text-[var(--color-text)] truncate" title={file.name}>{file.name}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {file.width && file.height ? `${file.width}x${file.height}` : "画像"}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const isCurrentFile = currentImage.id === file.id;
                      removeMediaFile(file.id);
                      if (isCurrentFile) {
                        const remaining = imageFiles.filter((f) => f.id !== file.id);
                        if (remaining.length > 0) {
                          setCurrentImage(remaining[0]);
                          setImageLoaded(false);
                        } else {
                          setCurrentImage(null);
                          setImageLoaded(false);
                          resetImageAdjustments();
                        }
                      }
                    }}
                    className="flex-shrink-0 p-1 text-[var(--color-text-muted)] hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-all rounded"
                    title="削除"
                  >
                    <X size={16} weight="bold" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom toolbar */}
        {currentImage && (
          <div className="bg-[var(--color-surface)] border-t border-[var(--color-border)] p-3 sm:p-5 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Rotation */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => setImageAdjustments({ rotation: (imageAdjustments.rotation - 90 + 360) % 360 })}
                    className="p-1.5 sm:p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-accent-soft)] rounded-[var(--radius-md)] transition-colors"
                    title="左に回転"
                  >
                    <ArrowCounterClockwise size={20} weight="bold" className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={() => setImageAdjustments({ rotation: (imageAdjustments.rotation + 90) % 360 })}
                    className="p-1.5 sm:p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-accent-soft)] rounded-[var(--radius-md)] transition-colors"
                    title="右に回転"
                  >
                    <ArrowClockwise size={20} weight="bold" className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                {/* Flip */}
                <div className="flex items-center gap-1 sm:gap-2 border-l border-[var(--color-border)] pl-2 sm:pl-4">
                  <button
                    onClick={() => setImageAdjustments({ flipHorizontal: !imageAdjustments.flipHorizontal })}
                    className={`p-1.5 sm:p-2 rounded-[var(--radius-md)] transition-colors ${
                      imageAdjustments.flipHorizontal
                        ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-text)]"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-accent-soft)]"
                    }`}
                    title="水平反転"
                  >
                    <ArrowsLeftRight size={20} weight="bold" className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={() => setImageAdjustments({ flipVertical: !imageAdjustments.flipVertical })}
                    className={`p-1.5 sm:p-2 rounded-[var(--radius-md)] transition-colors ${
                      imageAdjustments.flipVertical
                        ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-text)]"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-accent-soft)]"
                    }`}
                    title="垂直反転"
                  >
                    <ArrowsDownUp size={20} weight="bold" className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                {/* New image */}
                <div className="border-l border-[var(--color-border)] pl-2 sm:pl-4">
                  <button
                    onClick={() => {
                      if (currentImage) {
                        URL.revokeObjectURL(currentImage.url);
                        removeMediaFile(currentImage.id);
                      }
                      setCurrentImage(null);
                      setImageLoaded(false);
                      resetImageAdjustments();
                    }}
                    className="p-1.5 sm:p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-accent-soft)] rounded-[var(--radius-md)] transition-colors"
                    title="新しい画像"
                  >
                    <Plus size={20} weight="bold" className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                {/* Mobile: open editing panel */}
                <div className="md:hidden border-l border-[var(--color-border)] pl-2">
                  <button
                    onClick={() => setIsMobilePanelOpen(true)}
                    className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-accent-soft)] rounded-[var(--radius-md)] transition-colors"
                    title="編集パネルを開く"
                  >
                    <SlidersHorizontal size={16} weight="bold" />
                  </button>
                </div>
              </div>

              {/* Export buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button variant="ghost" size="sm" onClick={undoImageAdjustment} disabled={historyIndex <= 0} title="1つ前に戻す (Ctrl+Z)">
                  <ArrowCounterClockwise size={16} weight="bold" className="sm:mr-1 inline" />
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
                <Button variant="primary" size="sm" onClick={() => exportSettings.setShowExportModal(true)}>
                  <span className="hidden sm:inline">詳細エクスポート</span>
                  <span className="sm:hidden text-xs">保存</span>
                </Button>
                <button
                  onClick={() => setChatOpen(!chatOpen)}
                  className={`p-1.5 sm:p-2 rounded-[var(--radius-md)] transition-colors ${
                    chatOpen ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-text)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-accent-soft)]"
                  }`}
                  title="AI Chat"
                >
                  <ChatCircle size={20} weight="bold" className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Side panel */}
      {currentImage && (
        <>
          {/* Desktop sidebar */}
          <div className="hidden md:flex w-80 lg:w-96 bg-[var(--color-surface)] border-l border-[var(--color-border)] flex-col shadow-[var(--shadow-lg)]">
            {renderTabBar("desktop")}
            <div className="flex-1 overflow-y-auto p-5 lg:p-6">
              <TabContent activeTab={activeTab} variant="desktop" {...tabContentProps} />
            </div>
            {/* Image info */}
            <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg)]">
              <h4 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">画像情報</h4>
              <div className="space-y-1 text-xs text-[var(--color-text-muted)]">
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
              <div className="absolute bottom-0 left-0 right-0 bg-[var(--color-surface)] rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col animate-slide-up">
                <div className="flex items-center justify-center py-3">
                  <div className="w-10 h-1 bg-[var(--color-border)] rounded-full" />
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
                <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between">
                  <div className="text-xs text-[var(--color-text-muted)] truncate">
                    {currentImage.name} • {originalImageData ? `${originalImageData.width}x${originalImageData.height}` : `${currentImage.width}x${currentImage.height}`} • {(currentImage.size / 1024 / 1024).toFixed(1)}MB
                  </div>
                  <button onClick={() => setIsMobilePanelOpen(false)} className="ml-2 px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] bg-[var(--color-border)] rounded-[var(--radius-md)]">
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

      <AIChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        imageContext={currentImage ? `Image: ${currentImage.name}, ${originalImageData?.width}x${originalImageData?.height}` : undefined}
      />
    </div>
  );
}
