"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useImageProcessor } from "@/hooks/useImageProcessor";
import { Button, Slider, DropZone, ProgressBar, Modal } from "@/components/ui";
import { toast } from "@/stores/toastStore";
import { v4 as uuidv4 } from "uuid";
import { isHeicFile, ensureBrowserCompatibleImage } from "@/lib/heicConverter";
import { isRawFile, ensureBrowserCompatibleRawImage } from "@/lib/rawConverter";
import { ANALYTICS_EVENTS, trackClientEvent } from "@/lib/analytics/client";
import type { MediaFile } from "@/types";

type EditorTab = "adjust" | "crop" | "resize" | "filters" | "tools";
type CropAspectRatio = "free" | "1:1" | "4:3" | "16:9" | "9:16" | "3:2";
type FilterCategory = "all" | "basic" | "film" | "bw" | "color" | "creative";

interface ImageEditorProps {
  initialTab?: EditorTab;
  autoOpenExport?: boolean;
}

// Expanded preset filters - 25+ professional filters with gradient previews
const PRESET_FILTERS: { id: string; name: string; category: FilterCategory; gradient: string; adjustments: Record<string, number> }[] = [
  // Basic
  { id: "none", name: "オリジナル", category: "basic", gradient: "from-gray-300 to-gray-400", adjustments: {} },
  { id: "auto", name: "オート補正", category: "basic", gradient: "from-blue-300 to-indigo-400", adjustments: { brightness: 5, contrast: 10, saturation: 10, sharpness: 10 } },
  { id: "vivid", name: "ビビッド", category: "basic", gradient: "from-rose-400 to-violet-500", adjustments: { saturation: 40, contrast: 20 } },
  { id: "soft", name: "ソフト", category: "basic", gradient: "from-pink-200 to-blue-200", adjustments: { contrast: -15, brightness: 8, blur: 5 } },

  // Film
  { id: "vintage", name: "ビンテージ", category: "film", gradient: "from-amber-600 to-yellow-800", adjustments: { brightness: -5, contrast: 10, saturation: -30, exposure: -10 } },
  { id: "kodak", name: "Kodak風", category: "film", gradient: "from-yellow-400 to-red-500", adjustments: { brightness: 5, contrast: 8, saturation: 15, highlights: 10, shadows: -10 } },
  { id: "fuji", name: "Fuji風", category: "film", gradient: "from-green-400 to-emerald-600", adjustments: { saturation: 20, contrast: 15, highlights: -5, shadows: 10 } },
  { id: "portra", name: "Portra風", category: "film", gradient: "from-rose-300 to-amber-300", adjustments: { brightness: 3, contrast: -5, saturation: -10, exposure: 5, highlights: 15 } },
  { id: "cinematic", name: "シネマ", category: "film", gradient: "from-slate-700 to-blue-900", adjustments: { contrast: 25, saturation: -15, brightness: -8, highlights: -10, shadows: -20 } },
  { id: "fade", name: "フェード", category: "film", gradient: "from-gray-300 to-slate-400", adjustments: { contrast: -20, brightness: 10, saturation: -20 } },
  { id: "grain", name: "グレイン", category: "film", gradient: "from-stone-500 to-stone-700", adjustments: { contrast: 15, saturation: -25, brightness: -3, sharpness: 30 } },

  // B&W
  { id: "bw", name: "モノクロ", category: "bw", gradient: "from-gray-400 to-gray-800", adjustments: { saturation: -100 } },
  { id: "bw-high", name: "ハイコン白黒", category: "bw", gradient: "from-white to-black", adjustments: { saturation: -100, contrast: 40, brightness: -5 } },
  { id: "bw-soft", name: "ソフト白黒", category: "bw", gradient: "from-gray-300 to-gray-500", adjustments: { saturation: -100, contrast: -10, brightness: 10 } },
  { id: "sepia", name: "セピア", category: "bw", gradient: "from-amber-300 to-amber-700", adjustments: { saturation: -80, brightness: 5 } },
  { id: "noir", name: "ノワール", category: "bw", gradient: "from-gray-900 to-black", adjustments: { saturation: -100, contrast: 50, brightness: -15, shadows: -30, highlights: 20 } },

  // Color
  { id: "warm", name: "ウォーム", category: "color", gradient: "from-orange-300 to-rose-400", adjustments: { brightness: 5, saturation: 20, exposure: 5 } },
  { id: "cool", name: "クール", category: "color", gradient: "from-cyan-300 to-blue-500", adjustments: { brightness: -5, saturation: -10, contrast: 10 } },
  { id: "sunset", name: "サンセット", category: "color", gradient: "from-orange-400 to-pink-600", adjustments: { brightness: 8, saturation: 30, contrast: 10, highlights: 15 } },
  { id: "ocean", name: "オーシャン", category: "color", gradient: "from-teal-400 to-blue-600", adjustments: { saturation: 15, brightness: -5, contrast: 15, shadows: 10 } },
  { id: "forest", name: "フォレスト", category: "color", gradient: "from-green-500 to-emerald-800", adjustments: { saturation: 25, contrast: 10, brightness: -3, shadows: 5 } },
  { id: "lavender", name: "ラベンダー", category: "color", gradient: "from-purple-300 to-violet-400", adjustments: { saturation: -15, brightness: 10, contrast: -5, exposure: 5 } },

  // Creative
  { id: "dramatic", name: "ドラマチック", category: "creative", gradient: "from-red-800 to-gray-900", adjustments: { contrast: 30, saturation: -20, shadows: -20, highlights: 20 } },
  { id: "hdr", name: "HDR風", category: "creative", gradient: "from-blue-500 to-purple-600", adjustments: { contrast: 25, saturation: 15, highlights: -30, shadows: 30, sharpness: 20 } },
  { id: "glow", name: "グロー", category: "creative", gradient: "from-yellow-200 to-pink-300", adjustments: { brightness: 15, contrast: -10, saturation: 10, blur: 8 } },
  { id: "punch", name: "パンチ", category: "creative", gradient: "from-red-500 to-orange-600", adjustments: { contrast: 35, saturation: 25, sharpness: 25, brightness: -5 } },
  { id: "lomo", name: "ロモ", category: "creative", gradient: "from-indigo-600 to-pink-500", adjustments: { contrast: 30, saturation: 20, brightness: -10, shadows: -25 } },
];

const FILTER_CATEGORIES: { id: FilterCategory; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "basic", label: "基本" },
  { id: "film", label: "フィルム" },
  { id: "bw", label: "白黒" },
  { id: "color", label: "カラー" },
  { id: "creative", label: "クリエイティブ" },
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
  const [showExportModal, setShowExportModal] = useState(false);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  // Filter state
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [filterIntensity, setFilterIntensity] = useState(100);

  // Mosaic state
  const [mosaicMode, setMosaicMode] = useState(false);
  const [mosaicBlockSize, setMosaicBlockSize] = useState(15);
  const [mosaicBrushSize, setMosaicBrushSize] = useState(40);
  const mosaicCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isMosaicDrawing, setIsMosaicDrawing] = useState(false);

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
    fullResetImage,
    undoImageAdjustment,
    processingState,
    addMediaFile,
    originalImageData,
    historyIndex,
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

      if (isHeicFile(file)) {
        toast.info("Converting HEIC image...");
        file = await ensureBrowserCompatibleImage(file);
      } else if (isRawFile(file)) {
        toast.info("Converting RAW image...");
        file = await ensureBrowserCompatibleRawImage(file);
      } else if (!file.type.startsWith("image/")) {
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

        void trackClientEvent({
          eventName: ANALYTICS_EVENTS.FILE_SELECTED,
          eventParams: {
            media_type: "image",
            mime_type: file.type,
            file_name: file.name,
            file_size_bytes: file.size,
          },
        });
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

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setCropMode(activeTab === "crop");
    if (activeTab !== "tools") {
      setMosaicMode(false);
    }
  }, [activeTab]);

  // Ctrl+Z keyboard shortcut for undo
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

    if (!currentImage) {
      autoExportOpenedRef.current = false;
      return;
    }

    if (!autoExportOpenedRef.current) {
      setShowExportModal(true);
      autoExportOpenedRef.current = true;
    }
  }, [autoOpenExport, currentImage]);

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

  // Apply preset filter with intensity
  const handleApplyFilter = (filter: typeof PRESET_FILTERS[0]) => {
    if (filter.id === "none") {
      resetImageAdjustments();
    } else {
      const intensity = filterIntensity / 100;
      const scaledAdjustments: Record<string, number> = {};
      for (const [key, value] of Object.entries(filter.adjustments)) {
        scaledAdjustments[key] = Math.round(value * intensity);
      }
      setImageAdjustments({
        ...imageAdjustments,
        ...scaledAdjustments,
      });
    }
    toast.success(`${filter.name}フィルターを適用しました`);
  };

  // Mosaic: initialize mask canvas when entering mosaic mode
  useEffect(() => {
    if (mosaicMode && canvasRef.current && mosaicCanvasRef.current) {
      const mc = mosaicCanvasRef.current;
      mc.width = canvasRef.current.width;
      mc.height = canvasRef.current.height;
      const ctx = mc.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, mc.width, mc.height);
      }
    }
  }, [mosaicMode]);

  // Mosaic drawing handlers
  const handleMosaicDraw = (clientX: number, clientY: number) => {
    if (!mosaicMode || !isMosaicDrawing || !mosaicCanvasRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const ctx = mosaicCanvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.arc(x, y, mosaicBrushSize * scaleX, 0, Math.PI * 2);
    ctx.fill();
  };

  // Apply mosaic effect to marked areas
  const applyMosaic = () => {
    if (!canvasRef.current || !mosaicCanvasRef.current) return;

    const canvas = canvasRef.current;
    const maskCanvas = mosaicCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const maskCtx = maskCanvas.getContext("2d");
    if (!ctx || !maskCtx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const blockSize = mosaicBlockSize;

    // Pixelate areas where mask has been drawn
    for (let by = 0; by < canvas.height; by += blockSize) {
      for (let bx = 0; bx < canvas.width; bx += blockSize) {
        // Check if any pixel in this block is masked
        let isMasked = false;
        for (let y = by; y < Math.min(by + blockSize, canvas.height) && !isMasked; y++) {
          for (let x = bx; x < Math.min(bx + blockSize, canvas.width) && !isMasked; x++) {
            const idx = (y * maskCanvas.width + x) * 4;
            if (maskData.data[idx + 3] > 0) {
              isMasked = true;
            }
          }
        }

        if (!isMasked) continue;

        // Average color in this block
        let r = 0, g = 0, b = 0, count = 0;
        for (let y = by; y < Math.min(by + blockSize, canvas.height); y++) {
          for (let x = bx; x < Math.min(bx + blockSize, canvas.width); x++) {
            const idx = (y * canvas.width + x) * 4;
            r += imageData.data[idx];
            g += imageData.data[idx + 1];
            b += imageData.data[idx + 2];
            count++;
          }
        }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        // Fill block with average color
        for (let y = by; y < Math.min(by + blockSize, canvas.height); y++) {
          for (let x = bx; x < Math.min(bx + blockSize, canvas.width); x++) {
            const idx = (y * canvas.width + x) * 4;
            imageData.data[idx] = r;
            imageData.data[idx + 1] = g;
            imageData.data[idx + 2] = b;
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    setMosaicMode(false);
    toast.success("モザイクを適用しました");
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
    const processedFormat = exportFormat === "gif" ? "png" : exportFormat;
    void trackClientEvent({
      eventName: ANALYTICS_EVENTS.EDITOR_EXPORT_START,
      eventParams: {
        output_format: exportFormat,
        processing_format: processedFormat,
        quality_percent: exportQuality,
        width: exportWidth,
        height: exportHeight,
        file_name: currentImage?.name,
        export_mode: "advanced",
      },
    });

    // If dimensions changed, resize first
    if (originalImageData &&
        (exportWidth !== originalImageData.width || exportHeight !== originalImageData.height)) {
      await resizeImage(exportWidth, exportHeight, false);
    }

    const blob = await exportImage(processedFormat, exportQuality / 100);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = exportFormat === "jpg" ? "jpg" : exportFormat;
      a.download = `edited_${Date.now()}.${extension}`;
      a.click();
      URL.revokeObjectURL(url);
      setShowExportModal(false);

      void trackClientEvent({
        eventName: ANALYTICS_EVENTS.EDITOR_EXPORT_COMPLETE,
        eventParams: {
          output_format: extension,
          processing_format: processedFormat,
          quality_percent: exportQuality,
          width: exportWidth,
          height: exportHeight,
          file_name: currentImage?.name,
          export_mode: "advanced",
        },
      });

      // Restore original size if changed
      if (originalImageData &&
          (exportWidth !== originalImageData.width || exportHeight !== originalImageData.height)) {
        await resizeImage(originalImageData.width, originalImageData.height, false);
      }
    }
  };

  // Quick export
  const handleQuickExport = async (format: "png" | "jpg" | "webp") => {
    void trackClientEvent({
      eventName: ANALYTICS_EVENTS.EDITOR_EXPORT_START,
      eventParams: {
        output_format: format,
        file_name: currentImage?.name,
        export_mode: "quick",
      },
    });

    const blob = await exportImage(format);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `edited_${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);

      void trackClientEvent({
        eventName: ANALYTICS_EVENTS.EDITOR_EXPORT_COMPLETE,
        eventParams: {
          output_format: format,
          file_name: currentImage?.name,
          export_mode: "quick",
        },
      });
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
    { id: "tools", label: "ツール", icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
    <div className="h-full flex flex-col md:flex-row bg-gray-50 dark:bg-dark-950">
      {/* Main canvas area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Canvas - centered with proper spacing */}
        <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-dark-900 p-3 sm:p-6 lg:p-10 overflow-auto">
          {currentImage ? (
            <div
              className="relative inline-block"
              onMouseDown={!mosaicMode ? handleCropMouseDown : undefined}
              onMouseMove={!mosaicMode ? handleCropMouseMove : undefined}
              onMouseUp={!mosaicMode ? handleCropMouseUp : undefined}
              onMouseLeave={!mosaicMode ? handleCropMouseUp : undefined}
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
                className={`max-w-full max-h-[50vh] sm:max-h-[60vh] md:max-h-[70vh] rounded-lg shadow-lg ${cropMode ? "cursor-crosshair" : ""} ${mosaicMode ? "cursor-crosshair" : ""}`}
                onMouseDown={(e) => {
                  if (mosaicMode) {
                    setIsMosaicDrawing(true);
                    handleMosaicDraw(e.clientX, e.clientY);
                  }
                }}
                onMouseMove={(e) => {
                  if (mosaicMode) handleMosaicDraw(e.clientX, e.clientY);
                }}
                onMouseUp={() => { if (mosaicMode) setIsMosaicDrawing(false); }}
                onMouseLeave={() => { if (mosaicMode) setIsMosaicDrawing(false); }}
                onTouchStart={(e) => {
                  if (mosaicMode && e.touches[0]) {
                    e.preventDefault();
                    setIsMosaicDrawing(true);
                    handleMosaicDraw(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                onTouchMove={(e) => {
                  if (mosaicMode && e.touches[0]) {
                    e.preventDefault();
                    handleMosaicDraw(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                onTouchEnd={() => { if (mosaicMode) setIsMosaicDrawing(false); }}
              />

              {/* Mosaic mask overlay */}
              <canvas
                ref={mosaicCanvasRef}
                className={`absolute inset-0 w-full h-full rounded-lg pointer-events-none ${mosaicMode ? "opacity-40" : "opacity-0"}`}
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

              {/* Mosaic mode indicator */}
              {mosaicMode && (
                <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg z-10">
                  モザイク描画中 — 塗りつぶした箇所がモザイクになります
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

        {/* Bottom toolbar - responsive */}
        {currentImage && (
          <div className="bg-white dark:bg-dark-800 border-t border-gray-200 dark:border-dark-700 p-3 sm:p-5 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Rotation controls */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() =>
                      setImageAdjustments({
                        rotation: (imageAdjustments.rotation - 90 + 360) % 360,
                      })
                    }
                    className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                    title="左に回転"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                  <button
                    onClick={() =>
                      setImageAdjustments({
                        rotation: (imageAdjustments.rotation + 90) % 360,
                      })
                    }
                    className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                    title="右に回転"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 transform scale-x-[-1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                </div>

                {/* Flip controls */}
                <div className="flex items-center gap-1 sm:gap-2 border-l border-gray-200 dark:border-dark-700 pl-2 sm:pl-4">
                  <button
                    onClick={() =>
                      setImageAdjustments({
                        flipHorizontal: !imageAdjustments.flipHorizontal,
                      })
                    }
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
                    onClick={() =>
                      setImageAdjustments({
                        flipVertical: !imageAdjustments.flipVertical,
                      })
                    }
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

                {/* New image button */}
                <div className="border-l border-gray-200 dark:border-dark-700 pl-2 sm:pl-4">
                  <button
                    onClick={() => {
                      setCurrentImage(null);
                      setImageLoaded(false);
                      resetImageAdjustments();
                    }}
                    className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                    title="新しい画像"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {/* Mobile: open editing panel button */}
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

              {/* Export buttons - responsive */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={undoImageAdjustment}
                  disabled={historyIndex <= 0}
                  title="1つ前に戻す (Ctrl+Z)"
                >
                  <svg className="w-4 h-4 sm:mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  <span className="hidden sm:inline">戻す</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={fullResetImage}>
                  <span className="hidden sm:inline">リセット</span>
                  <span className="sm:hidden text-xs">Reset</span>
                </Button>
                <div className="hidden sm:flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => handleQuickExport("png")}>
                    PNG
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleQuickExport("jpg")}>
                    JPG
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleQuickExport("webp")}>
                    WebP
                  </Button>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowExportModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  <span className="hidden sm:inline">詳細エクスポート</span>
                  <span className="sm:hidden text-xs">保存</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Side panel - desktop: sidebar, mobile: bottom sheet overlay */}
      {currentImage && (
        <>
          {/* Desktop sidebar */}
          <div className="hidden md:flex w-80 lg:w-96 bg-white dark:bg-dark-800 border-l border-gray-200 dark:border-dark-700 flex-col shadow-xl">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-dark-700">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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

            {/* Tab content */}
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
                {/* Category filter */}
                <div className="flex flex-wrap gap-1.5">
                  {FILTER_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setFilterCategory(cat.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        filterCategory === cat.id
                          ? "bg-primary-600 text-white"
                          : "bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Intensity slider */}
                <Slider
                  label="フィルター強度"
                  min={10}
                  max={100}
                  value={filterIntensity}
                  unit="%"
                  onChange={(e) => setFilterIntensity(parseInt(e.target.value, 10))}
                />

                {/* Filter grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {PRESET_FILTERS
                    .filter((f) => filterCategory === "all" || f.category === filterCategory)
                    .map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => handleApplyFilter(filter)}
                      className="group relative overflow-hidden rounded-xl border-2 border-gray-200 dark:border-dark-600 hover:border-primary-500 dark:hover:border-primary-400 transition-all duration-200 cursor-pointer hover:shadow-lg"
                    >
                      <div className={`aspect-[4/3] bg-gradient-to-br ${filter.gradient}`} />
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

            {/* Tools tab */}
            {activeTab === "tools" && (
              <div className="space-y-5">
                {/* Mosaic tool */}
                <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                    モザイクツール
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    画像上をなぞってモザイクをかけたい範囲を指定します。
                  </p>

                  {!mosaicMode ? (
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={() => setMosaicMode(true)}
                    >
                      モザイク描画を開始
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <Slider
                        label="ブロックサイズ"
                        min={5}
                        max={50}
                        value={mosaicBlockSize}
                        unit="px"
                        onChange={(e) => setMosaicBlockSize(parseInt(e.target.value, 10))}
                      />
                      <Slider
                        label="ブラシサイズ"
                        min={10}
                        max={100}
                        value={mosaicBrushSize}
                        unit="px"
                        onChange={(e) => setMosaicBrushSize(parseInt(e.target.value, 10))}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setMosaicMode(false);
                            if (mosaicCanvasRef.current) {
                              const ctx = mosaicCanvasRef.current.getContext("2d");
                              if (ctx) ctx.clearRect(0, 0, mosaicCanvasRef.current.width, mosaicCanvasRef.current.height);
                            }
                          }}
                        >
                          キャンセル
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          onClick={applyMosaic}
                        >
                          モザイク適用
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI features - Coming Soon */}
                <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">AI機能 (Coming Soon)</span>
                  </div>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mb-3">
                    AI高画質化、背景削除、カラー化など
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: "🔍", title: "AI高画質化" },
                      { icon: "✂️", title: "背景削除" },
                      { icon: "🎨", title: "カラー化" },
                      { icon: "👤", title: "顔補正" },
                    ].map((feature, index) => (
                      <div key={index} className="p-2.5 bg-white/50 dark:bg-dark-800/50 rounded-lg text-center opacity-60">
                        <span className="text-lg">{feature.icon}</span>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{feature.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
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

          {/* Mobile bottom sheet overlay */}
          {isMobilePanelOpen && (
            <div className="md:hidden fixed inset-0 z-50">
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setIsMobilePanelOpen(false)}
              />

              {/* Bottom sheet */}
              <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-dark-800 rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col animate-slide-up">
                {/* Handle bar */}
                <div className="flex items-center justify-center py-3">
                  <div className="w-10 h-1 bg-gray-300 dark:bg-dark-600 rounded-full" />
                </div>

                {/* Tabs - horizontal scrollable */}
                <div className="flex border-b border-gray-200 dark:border-dark-700 px-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-1.5 text-xs font-medium transition-colors ${
                        activeTab === tab.id
                          ? "text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/10"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab content - scrollable */}
                <div className="flex-1 overflow-y-auto p-4 pb-8">
                  {/* Adjust tab */}
                  {activeTab === "adjust" && (
                    <div className="space-y-5">
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
                    <div className="space-y-5">
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
                                  : "bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {ratio === "free" ? "自由" : ratio}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          パネルを閉じて画像上でドラッグしてください
                        </p>
                      </div>
                      {cropRect.width > 10 && cropRect.height > 10 && (
                        <p className="text-sm text-gray-500">
                          選択範囲: {Math.round(cropRect.width)} x {Math.round(cropRect.height)}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => { setCropMode(false); setCropRect({ x: 0, y: 0, width: 0, height: 0 }); }} className="flex-1">
                          キャンセル
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => { handleApplyCrop(); setIsMobilePanelOpen(false); }} className="flex-1" disabled={cropRect.width < 10 || cropRect.height < 10}>
                          適用
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Resize tab */}
                  {activeTab === "resize" && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">幅 (px)</label>
                          <input type="number" value={resizeWidth} onChange={(e) => handleResizeWidthChange(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">高さ (px)</label>
                          <input type="number" value={resizeHeight} onChange={(e) => handleResizeHeightChange(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={resizeMaintainAspect} onChange={(e) => setResizeMaintainAspect(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">縦横比を維持</span>
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[{ label: "50%", factor: 0.5 }, { label: "75%", factor: 0.75 }, { label: "150%", factor: 1.5 }, { label: "200%", factor: 2 }].map((preset) => (
                          <button key={preset.label} onClick={() => { if (originalImageData) { setResizeWidth(Math.round(originalImageData.width * preset.factor)); setResizeHeight(Math.round(originalImageData.height * preset.factor)); } }}
                            className="px-2 py-2 text-sm bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-lg"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      <Button variant="primary" onClick={handleApplyResize} className="w-full">リサイズを適用</Button>
                    </div>
                  )}

                  {/* Filters tab */}
                  {activeTab === "filters" && (
                    <div className="space-y-4">
                      {/* Category filter - scrollable on mobile */}
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {FILTER_CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setFilterCategory(cat.id)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                              filterCategory === cat.id
                                ? "bg-primary-600 text-white"
                                : "bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>

                      <Slider
                        label="強度"
                        min={10}
                        max={100}
                        value={filterIntensity}
                        unit="%"
                        onChange={(e) => setFilterIntensity(parseInt(e.target.value, 10))}
                      />

                      <div className="grid grid-cols-3 gap-2">
                        {PRESET_FILTERS
                          .filter((f) => filterCategory === "all" || f.category === filterCategory)
                          .map((filter) => (
                          <button key={filter.id} onClick={() => handleApplyFilter(filter)}
                            className="group relative overflow-hidden rounded-xl border-2 border-gray-200 dark:border-dark-600 hover:border-primary-500 hover:shadow-lg transition-all cursor-pointer"
                          >
                            <div className={`aspect-[4/3] bg-gradient-to-br ${filter.gradient}`} />
                            <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm py-0.5 px-1">
                              <span className="text-[10px] font-medium text-white">{filter.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tools tab */}
                  {activeTab === "tools" && (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">モザイクツール</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                          パネルを閉じて画像上をなぞると、その範囲にモザイクがかかります。
                        </p>
                        {!mosaicMode ? (
                          <Button variant="primary" size="sm" className="w-full" onClick={() => { setMosaicMode(true); setIsMobilePanelOpen(false); }}>
                            モザイク描画を開始
                          </Button>
                        ) : (
                          <div className="space-y-3">
                            <Slider label="ブロックサイズ" min={5} max={50} value={mosaicBlockSize} unit="px"
                              onChange={(e) => setMosaicBlockSize(parseInt(e.target.value, 10))}
                            />
                            <Slider label="ブラシサイズ" min={10} max={100} value={mosaicBrushSize} unit="px"
                              onChange={(e) => setMosaicBrushSize(parseInt(e.target.value, 10))}
                            />
                            <div className="flex gap-2">
                              <Button variant="secondary" size="sm" className="flex-1" onClick={() => { setMosaicMode(false); }}>
                                キャンセル
                              </Button>
                              <Button variant="primary" size="sm" className="flex-1" onClick={() => { applyMosaic(); setIsMobilePanelOpen(false); }}>
                                適用
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                          AI機能（高画質化・背景削除等）は近日公開予定
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Image info at bottom of sheet */}
                <div className="p-3 border-t border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900 flex items-center justify-between">
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {currentImage.name} • {originalImageData ? `${originalImageData.width}x${originalImageData.height}` : `${currentImage.width}x${currentImage.height}`} • {(currentImage.size / 1024 / 1024).toFixed(1)}MB
                  </div>
                  <button
                    onClick={() => setIsMobilePanelOpen(false)}
                    className="ml-2 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-dark-700 rounded-lg"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
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
