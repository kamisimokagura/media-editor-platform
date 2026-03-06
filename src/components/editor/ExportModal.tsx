"use client";

import React from "react";
import { Button, Modal } from "@/components/ui";
import { EXPORT_FORMATS, FORMAT_DESCRIPTIONS, type ExportFormat } from "./constants/filters";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportFormat: ExportFormat;
  setExportFormat: (format: ExportFormat) => void;
  exportQuality: number;
  setExportQuality: (quality: number) => void;
  exportWidth: number;
  exportHeight: number;
  onExportWidthChange: (width: number) => void;
  onExportHeightChange: (height: number) => void;
  maintainAspectRatio: boolean;
  setMaintainAspectRatio: (maintain: boolean) => void;
  estimateFileSize: () => string;
  onExport: () => void;
}

export function ExportModal({
  isOpen,
  onClose,
  exportFormat,
  setExportFormat,
  exportQuality,
  setExportQuality,
  exportWidth,
  exportHeight,
  onExportWidthChange,
  onExportHeightChange,
  maintainAspectRatio,
  setMaintainAspectRatio,
  estimateFileSize,
  onExport,
}: ExportModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="詳細エクスポート設定">
      <div className="space-y-6">
        {/* Format selection */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-3">
            フォーマット
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {EXPORT_FORMATS.map((format) => (
              <button
                key={format}
                onClick={() => setExportFormat(format)}
                className={`px-4 py-3 text-sm font-medium rounded-[var(--radius-md)] transition-all ${
                  exportFormat === format
                    ? "bg-[var(--color-accent)] text-white shadow-[var(--shadow-md)]"
                    : "bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent-text)]"
                }`}
              >
                {format.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            {FORMAT_DESCRIPTIONS[exportFormat]}
          </p>
        </div>

        {/* Quality slider (not for PNG/BMP) */}
        {exportFormat !== "png" && exportFormat !== "bmp" && (
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              品質: {exportQuality}%
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={exportQuality}
              onChange={(e) => setExportQuality(parseInt(e.target.value))}
              className="w-full h-2 bg-[var(--color-border)] rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)]"
            />
            <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
              <span>小さいサイズ</span>
              <span>高品質</span>
            </div>
          </div>
        )}

        {/* Dimensions */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-3">
            サイズ
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">幅 (px)</label>
              <input
                type="number"
                value={exportWidth}
                onChange={(e) => onExportWidthChange(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">高さ (px)</label>
              <input
                type="number"
                value={exportHeight}
                onChange={(e) => onExportHeightChange(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text)]"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <input
              type="checkbox"
              checked={maintainAspectRatio}
              onChange={(e) => setMaintainAspectRatio(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
            />
            <span className="text-sm text-[var(--color-text-muted)]">縦横比を維持</span>
          </label>
        </div>

        {/* Estimated file size */}
        <div className="p-4 bg-[var(--color-bg)] rounded-[var(--radius-md)]">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-muted)]">推定ファイルサイズ</span>
            <span className="text-sm font-medium text-[var(--color-text)]">{estimateFileSize()}</span>
          </div>
        </div>

        {/* Export button */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={onExport}
            className="flex-1"
          >
            ダウンロード
          </Button>
        </div>
      </div>
    </Modal>
  );
}
