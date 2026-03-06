"use client";

import React from "react";
import { Button, Slider } from "@/components/ui";
import { AIToolbar } from "@/components/ai";
import { SquaresFour } from "@phosphor-icons/react";
import type { ImageAdjustments } from "@/types";
import {
  ADJUSTMENT_CONTROLS,
  CROP_ASPECT_RATIOS,
  FILTER_CATEGORIES,
  PRESET_FILTERS,
  RESIZE_PRESETS,
  type EditorTab,
  type CropAspectRatio,
  type FilterCategory,
  type PresetFilter,
} from "../constants/filters";

// ─── Adjust Panel ─────────────────────────────────────

interface AdjustPanelProps {
  imageAdjustments: ImageAdjustments;
  setImageAdjustments: (adjustments: Partial<ImageAdjustments>) => void;
}

export function AdjustPanel({ imageAdjustments, setImageAdjustments }: AdjustPanelProps) {
  return (
    <div className="space-y-6">
      {ADJUSTMENT_CONTROLS.map(({ key, label, min, max }) => (
        <Slider
          key={key}
          label={label}
          min={min}
          max={max}
          value={imageAdjustments[key] as number}
          unit=""
          onChange={(e) =>
            setImageAdjustments({ [key]: parseInt(e.target.value, 10) })
          }
        />
      ))}
    </div>
  );
}

// ─── Crop Panel ───────────────────────────────────────

interface CropPanelProps {
  cropAspectRatio: CropAspectRatio;
  setCropAspectRatio: (ratio: CropAspectRatio) => void;
  cropRect: { width: number; height: number };
  onApplyCrop: () => void;
  onCancelCrop: () => void;
  variant?: "desktop" | "mobile";
}

export function CropPanel({
  cropAspectRatio,
  setCropAspectRatio,
  cropRect,
  onApplyCrop,
  onCancelCrop,
  variant = "desktop",
}: CropPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">
          アスペクト比
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {CROP_ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio}
              onClick={() => setCropAspectRatio(ratio)}
              className={`px-3 py-2 text-sm rounded-[var(--radius-md)] transition-colors ${
                cropAspectRatio === ratio
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent-text)]"
              }`}
            >
              {ratio === "free" ? "自由" : ratio}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 bg-[var(--color-accent-soft)] rounded-[var(--radius-md)]">
        <p className="text-sm text-[var(--color-accent-text)]">
          {variant === "mobile"
            ? "パネルを閉じて画像上でドラッグしてください"
            : "画像上でドラッグして範囲を選択してください"}
        </p>
      </div>

      {cropRect.width > 10 && cropRect.height > 10 && (
        <div className="text-sm text-[var(--color-text-muted)]">
          <p>選択範囲: {Math.round(cropRect.width)} x {Math.round(cropRect.height)}</p>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={onCancelCrop} className="flex-1">
          キャンセル
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onApplyCrop}
          className="flex-1"
          disabled={cropRect.width < 10 || cropRect.height < 10}
        >
          適用
        </Button>
      </div>
    </div>
  );
}

// ─── Resize Panel ─────────────────────────────────────

interface ResizePanelProps {
  resizeWidth: number;
  resizeHeight: number;
  resizeMaintainAspect: boolean;
  originalImageData: { width: number; height: number } | null;
  onResizeWidthChange: (width: number) => void;
  onResizeHeightChange: (height: number) => void;
  onMaintainAspectChange: (maintain: boolean) => void;
  onApplyResize: () => void;
  variant?: "desktop" | "mobile";
}

export function ResizePanel({
  resizeWidth,
  resizeHeight,
  resizeMaintainAspect,
  originalImageData,
  onResizeWidthChange,
  onResizeHeightChange,
  onMaintainAspectChange,
  onApplyResize,
  variant = "desktop",
}: ResizePanelProps) {
  const isMobile = variant === "mobile";

  return (
    <div className="space-y-6">
      <div className={isMobile ? "grid grid-cols-2 gap-3" : undefined}>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
            幅 (px)
          </label>
          <input
            type="number"
            value={resizeWidth}
            onChange={(e) => onResizeWidthChange(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
          />
        </div>

        <div className={isMobile ? undefined : "mt-4"}>
          <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
            高さ (px)
          </label>
          <input
            type="number"
            value={resizeHeight}
            onChange={(e) => onResizeHeightChange(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={resizeMaintainAspect}
          onChange={(e) => onMaintainAspectChange(e.target.checked)}
          className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
        />
        <span className="text-sm text-[var(--color-text-muted)]">縦横比を維持</span>
      </label>

      <div>
        <h4 className="text-sm font-medium text-[var(--color-text-muted)] mb-3">
          プリセット
        </h4>
        <div className={`grid gap-2 ${isMobile ? "grid-cols-4" : "grid-cols-2"}`}>
          {RESIZE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                if (originalImageData) {
                  onResizeWidthChange(Math.round(originalImageData.width * preset.factor));
                  onResizeHeightChange(Math.round(originalImageData.height * preset.factor));
                }
              }}
              className="px-3 py-2 text-sm bg-[var(--color-bg)] text-[var(--color-text-muted)] rounded-[var(--radius-md)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent-text)] transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <Button variant="primary" onClick={onApplyResize} className="w-full">
        リサイズを適用
      </Button>
    </div>
  );
}

// ─── Filters Panel ────────────────────────────────────

interface FiltersPanelProps {
  filterCategory: FilterCategory;
  setFilterCategory: (category: FilterCategory) => void;
  filterIntensity: number;
  setFilterIntensity: (intensity: number) => void;
  onApplyFilter: (filter: PresetFilter) => void;
  variant?: "desktop" | "mobile";
}

export function FiltersPanel({
  filterCategory,
  setFilterCategory,
  filterIntensity,
  setFilterIntensity,
  onApplyFilter,
  variant = "desktop",
}: FiltersPanelProps) {
  const isMobile = variant === "mobile";

  return (
    <div className="space-y-4">
      <div className={`flex ${isMobile ? "gap-1.5 overflow-x-auto pb-1" : "flex-wrap gap-1.5"}`}>
        {FILTER_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilterCategory(cat.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] transition-colors ${
              isMobile ? "whitespace-nowrap" : ""
            } ${
              filterCategory === cat.id
                ? "bg-[var(--color-accent)] text-white"
                : "bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent-text)]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <Slider
        label={isMobile ? "強度" : "フィルター強度"}
        min={10}
        max={100}
        value={filterIntensity}
        unit="%"
        onChange={(e) => setFilterIntensity(parseInt(e.target.value, 10))}
      />

      <div className={`grid gap-2.5 ${isMobile ? "grid-cols-3" : "grid-cols-2"}`}>
        {PRESET_FILTERS
          .filter((f) => filterCategory === "all" || f.category === filterCategory)
          .map((filter) => (
          <button
            key={filter.id}
            onClick={() => onApplyFilter(filter)}
            className="group relative overflow-hidden rounded-[var(--radius-lg)] border-2 border-[var(--color-border)] hover:border-[var(--color-accent)] transition-all duration-200 cursor-pointer hover:shadow-[var(--shadow-md)]"
          >
            <div className={`aspect-[4/3] bg-gradient-to-br ${filter.gradient}`} />
            <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm py-1.5 px-2">
              <span className={`font-medium text-white ${isMobile ? "text-[10px]" : "text-xs"}`}>
                {filter.name}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Tools Panel ──────────────────────────────────────

interface ToolsPanelProps {
  mosaicMode: boolean;
  mosaicBlockSize: number;
  mosaicBrushSize: number;
  onSetMosaicMode: (mode: boolean) => void;
  onSetMosaicBlockSize: (size: number) => void;
  onSetMosaicBrushSize: (size: number) => void;
  onApplyMosaic: () => void;
  onCancelMosaic: () => void;
  variant?: "desktop" | "mobile";
  onCloseMobilePanel?: () => void;
  onAIFeatureSelect?: (featureId: string) => void;
}

export function ToolsPanel({
  mosaicMode,
  mosaicBlockSize,
  mosaicBrushSize,
  onSetMosaicMode,
  onSetMosaicBlockSize,
  onSetMosaicBrushSize,
  onApplyMosaic,
  onCancelMosaic,
  variant = "desktop",
  onCloseMobilePanel,
  onAIFeatureSelect,
}: ToolsPanelProps) {
  const isMobile = variant === "mobile";

  return (
    <div className="space-y-5">
      <div className="p-4 bg-[var(--color-bg)] rounded-[var(--radius-lg)]">
        <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
          <SquaresFour size={16} weight="bold" />
          モザイクツール
        </h4>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          {isMobile
            ? "パネルを閉じて画像上をなぞると、その範囲にモザイクがかかります。"
            : "画像上をなぞってモザイクをかけたい範囲を指定します。"}
        </p>

        {!mosaicMode ? (
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() => {
              onSetMosaicMode(true);
              if (isMobile) onCloseMobilePanel?.();
            }}
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
              onChange={(e) => onSetMosaicBlockSize(parseInt(e.target.value, 10))}
            />
            <Slider
              label="ブラシサイズ"
              min={10}
              max={100}
              value={mosaicBrushSize}
              unit="px"
              onChange={(e) => onSetMosaicBrushSize(parseInt(e.target.value, 10))}
            />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={onCancelMosaic}>
                キャンセル
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={() => {
                  onApplyMosaic();
                  if (isMobile) onCloseMobilePanel?.();
                }}
              >
                モザイク適用
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* AI features */}
      {onAIFeatureSelect && (
        <AIToolbar onFeatureSelect={onAIFeatureSelect} />
      )}
    </div>
  );
}

// ─── Tab Content Switcher ─────────────────────────────

export interface TabContentProps {
  activeTab: EditorTab;
  variant?: "desktop" | "mobile";

  // Adjust
  imageAdjustments: ImageAdjustments;
  setImageAdjustments: (adjustments: Partial<ImageAdjustments>) => void;

  // Crop
  cropAspectRatio: CropAspectRatio;
  setCropAspectRatio: (ratio: CropAspectRatio) => void;
  cropRect: { width: number; height: number };
  onApplyCrop: () => void;
  onCancelCrop: () => void;

  // Resize
  resizeWidth: number;
  resizeHeight: number;
  resizeMaintainAspect: boolean;
  originalImageData: { width: number; height: number } | null;
  onResizeWidthChange: (width: number) => void;
  onResizeHeightChange: (height: number) => void;
  onMaintainAspectChange: (maintain: boolean) => void;
  onApplyResize: () => void;

  // Filters
  filterCategory: FilterCategory;
  setFilterCategory: (category: FilterCategory) => void;
  filterIntensity: number;
  setFilterIntensity: (intensity: number) => void;
  onApplyFilter: (filter: PresetFilter) => void;

  // Tools (mosaic)
  mosaicMode: boolean;
  mosaicBlockSize: number;
  mosaicBrushSize: number;
  onSetMosaicMode: (mode: boolean) => void;
  onSetMosaicBlockSize: (size: number) => void;
  onSetMosaicBrushSize: (size: number) => void;
  onApplyMosaic: () => void;
  onCancelMosaic: () => void;
  onCloseMobilePanel?: () => void;

  // AI
  onAIFeatureSelect?: (featureId: string) => void;
}

export function TabContent(props: TabContentProps) {
  const { activeTab, variant = "desktop" } = props;

  switch (activeTab) {
    case "adjust":
      return (
        <AdjustPanel
          imageAdjustments={props.imageAdjustments}
          setImageAdjustments={props.setImageAdjustments}
        />
      );
    case "crop":
      return (
        <CropPanel
          cropAspectRatio={props.cropAspectRatio}
          setCropAspectRatio={props.setCropAspectRatio}
          cropRect={props.cropRect}
          onApplyCrop={props.onApplyCrop}
          onCancelCrop={props.onCancelCrop}
          variant={variant}
        />
      );
    case "resize":
      return (
        <ResizePanel
          resizeWidth={props.resizeWidth}
          resizeHeight={props.resizeHeight}
          resizeMaintainAspect={props.resizeMaintainAspect}
          originalImageData={props.originalImageData}
          onResizeWidthChange={props.onResizeWidthChange}
          onResizeHeightChange={props.onResizeHeightChange}
          onMaintainAspectChange={props.onMaintainAspectChange}
          onApplyResize={props.onApplyResize}
          variant={variant}
        />
      );
    case "filters":
      return (
        <FiltersPanel
          filterCategory={props.filterCategory}
          setFilterCategory={props.setFilterCategory}
          filterIntensity={props.filterIntensity}
          setFilterIntensity={props.setFilterIntensity}
          onApplyFilter={props.onApplyFilter}
          variant={variant}
        />
      );
    case "tools":
      return (
        <ToolsPanel
          mosaicMode={props.mosaicMode}
          mosaicBlockSize={props.mosaicBlockSize}
          mosaicBrushSize={props.mosaicBrushSize}
          onSetMosaicMode={props.onSetMosaicMode}
          onSetMosaicBlockSize={props.onSetMosaicBlockSize}
          onSetMosaicBrushSize={props.onSetMosaicBrushSize}
          onApplyMosaic={props.onApplyMosaic}
          onCancelMosaic={props.onCancelMosaic}
          variant={variant}
          onCloseMobilePanel={props.onCloseMobilePanel}
          onAIFeatureSelect={props.onAIFeatureSelect}
        />
      );
    case "ai":
      return (
        <AIToolbar onFeatureSelect={props.onAIFeatureSelect!} />
      );
  }
}
