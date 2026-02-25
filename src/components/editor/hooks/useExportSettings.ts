import { useState, useCallback } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { ANALYTICS_EVENTS, trackClientEvent } from "@/lib/analytics/client";
import type { ExportFormat } from "../constants/filters";

interface UseExportSettingsOptions {
  exportImage: (format: "png" | "jpg" | "webp" | "avif" | "bmp", quality?: number) => Promise<Blob | null>;
  resizeImage: (width: number, height: number, maintainAspectRatio?: boolean) => Promise<void>;
}

export function useExportSettings({ exportImage, resizeImage }: UseExportSettingsOptions) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>("webp");
  const [exportQuality, setExportQuality] = useState(90);
  const [exportWidth, setExportWidth] = useState(0);
  const [exportHeight, setExportHeight] = useState(0);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);

  const { currentImage, originalImageData } = useEditorStore();

  const handleExportWidthChange = useCallback((newWidth: number) => {
    setExportWidth(newWidth);
    if (maintainAspectRatio && originalImageData) {
      const ratio = originalImageData.height / originalImageData.width;
      setExportHeight(Math.round(newWidth * ratio));
    }
  }, [maintainAspectRatio, originalImageData]);

  const handleExportHeightChange = useCallback((newHeight: number) => {
    setExportHeight(newHeight);
    if (maintainAspectRatio && originalImageData) {
      const ratio = originalImageData.width / originalImageData.height;
      setExportWidth(Math.round(newHeight * ratio));
    }
  }, [maintainAspectRatio, originalImageData]);

  const estimateFileSize = useCallback(() => {
    if (!originalImageData) return "---";
    const pixels = exportWidth * exportHeight;
    let size: number;

    switch (exportFormat) {
      case "png": size = pixels * 3 * 0.5; break;
      case "jpg": size = pixels * 3 * (exportQuality / 100) * 0.3; break;
      case "webp": size = pixels * 3 * (exportQuality / 100) * 0.2; break;
      case "avif": size = pixels * 3 * (exportQuality / 100) * 0.15; break;
      case "bmp": size = pixels * 3; break;
      case "gif": size = pixels * 0.5; break;
      default: size = pixels * 3;
    }

    if (size > 1024 * 1024) {
      return `約 ${(size / 1024 / 1024).toFixed(1)} MB`;
    }
    return `約 ${(size / 1024).toFixed(0)} KB`;
  }, [originalImageData, exportWidth, exportHeight, exportFormat, exportQuality]);

  const handleExport = useCallback(async () => {
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

      if (originalImageData &&
          (exportWidth !== originalImageData.width || exportHeight !== originalImageData.height)) {
        await resizeImage(originalImageData.width, originalImageData.height, false);
      }
    }
  }, [exportFormat, exportQuality, exportWidth, exportHeight, currentImage?.name, originalImageData, resizeImage, exportImage]);

  const handleQuickExport = useCallback(async (format: "png" | "jpg" | "webp") => {
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
  }, [currentImage?.name, exportImage]);

  return {
    exportFormat,
    setExportFormat,
    exportQuality,
    setExportQuality,
    exportWidth,
    setExportWidth,
    exportHeight,
    setExportHeight,
    maintainAspectRatio,
    setMaintainAspectRatio,
    showExportModal,
    setShowExportModal,
    handleExportWidthChange,
    handleExportHeightChange,
    estimateFileSize,
    handleExport,
    handleQuickExport,
  };
}
