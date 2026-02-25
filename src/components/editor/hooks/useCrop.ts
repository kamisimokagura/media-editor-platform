import { useState, useCallback } from "react";
import { toast } from "@/stores/toastStore";
import type { ImageAdjustments } from "@/types";
import type { CropAspectRatio } from "../constants/filters";
import { CROP_RATIO_VALUES } from "../constants/filters";

interface UseCropOptions {
  getCanvasCoordinates: (clientX: number, clientY: number) => { x: number; y: number; scaleX: number; scaleY: number } | null;
  imageAdjustments: ImageAdjustments;
  applyAdjustments: (adjustments: ImageAdjustments) => void;
  cropImage: (x: number, y: number, width: number, height: number) => Promise<void>;
}

export function useCrop({ getCanvasCoordinates, imageAdjustments, applyAdjustments, cropImage }: UseCropOptions) {
  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [cropAspectRatio, setCropAspectRatio] = useState<CropAspectRatio>("free");
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [cropDragStart, setCropDragStart] = useState({ x: 0, y: 0 });

  const beginCropSelection = useCallback((clientX: number, clientY: number) => {
    if (!cropMode) return;
    const coordinates = getCanvasCoordinates(clientX, clientY);
    if (!coordinates) return;

    const { x, y } = coordinates;
    setIsDraggingCrop(true);
    setCropDragStart({ x, y });
    setCropRect({ x, y, width: 0, height: 0 });
  }, [cropMode, getCanvasCoordinates]);

  const updateCropSelection = useCallback((clientX: number, clientY: number) => {
    if (!isDraggingCrop) return;
    const coordinates = getCanvasCoordinates(clientX, clientY);
    if (!coordinates) return;

    const { x: currentX, y: currentY } = coordinates;
    const width = currentX - cropDragStart.x;
    let height = currentY - cropDragStart.y;

    if (cropAspectRatio !== "free") {
      const ratio = CROP_RATIO_VALUES[cropAspectRatio];
      height = width / ratio;
    }

    setCropRect({
      x: width > 0 ? cropDragStart.x : cropDragStart.x + width,
      y: height > 0 ? cropDragStart.y : cropDragStart.y + height,
      width: Math.abs(width),
      height: Math.abs(height),
    });
  }, [cropAspectRatio, cropDragStart.x, cropDragStart.y, getCanvasCoordinates, isDraggingCrop]);

  const handleCropMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    beginCropSelection(e.clientX, e.clientY);
  }, [beginCropSelection]);

  const handleCropMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    updateCropSelection(e.clientX, e.clientY);
  }, [updateCropSelection]);

  const handleCropTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    e.preventDefault();
    beginCropSelection(touch.clientX, touch.clientY);
  }, [beginCropSelection]);

  const handleCropTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    e.preventDefault();
    updateCropSelection(touch.clientX, touch.clientY);
  }, [updateCropSelection]);

  const handleCropMouseUp = useCallback(() => {
    setIsDraggingCrop(false);
  }, []);

  const handleApplyCrop = useCallback(async () => {
    if (cropRect.width > 10 && cropRect.height > 10) {
      await cropImage(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
      setCropMode(false);
      applyAdjustments(imageAdjustments);
    } else {
      toast.error("クロップ範囲を選択してください");
    }
  }, [cropRect, cropImage, applyAdjustments, imageAdjustments]);

  const cancelCrop = useCallback(() => {
    setCropMode(false);
    setCropRect({ x: 0, y: 0, width: 0, height: 0 });
  }, []);

  return {
    cropMode,
    setCropMode,
    cropRect,
    setCropRect,
    cropAspectRatio,
    setCropAspectRatio,
    handleCropMouseDown,
    handleCropMouseMove,
    handleCropTouchStart,
    handleCropTouchMove,
    handleCropMouseUp,
    handleApplyCrop,
    cancelCrop,
  };
}
