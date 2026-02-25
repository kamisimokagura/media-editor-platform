"use client";

import React from "react";
import { Button, Slider } from "@/components/ui";
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
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          アスペクト比
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {CROP_ASPECT_RATIOS.map((ratio) => (
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
          {variant === "mobile"
            ? "パネルを閉じて画像上でドラッグしてください"
            : "画像上でドラッグして範囲を選択してください"}
        </p>
      </div>

      {cropRect.width > 10 && cropRect.height > 10 && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            幅 (px)
          </label>
          <input
            type="number"
            value={resizeWidth}
            onChange={(e) => onResizeWidthChange(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div className={isMobile ? undefined : "mt-4"}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            高さ (px)
          </label>
          <input
            type="number"
            value={resizeHeight}
            onChange={(e) => onResizeHeightChange(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={resizeMaintainAspect}
          onChange={(e) => onMaintainAspectChange(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">縦横比を維持</span>
      </label>

      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
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
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
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
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              isMobile ? "whitespace-nowrap" : ""
            } ${
              filterCategory === cat.id
                ? "bg-primary-600 text-white"
                : "bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600"
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
            className="group relative overflow-hidden rounded-xl border-2 border-gray-200 dark:border-dark-600 hover:border-primary-500 dark:hover:border-primary-400 transition-all duration-200 cursor-pointer hover:shadow-lg"
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
}: ToolsPanelProps) {
  const isMobile = variant === "mobile";

  return (
    <div className="space-y-5">
      <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
          モザイクツール
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
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

      {/* AI features - Coming Soon */}
      <div className={`p-4 rounded-xl border ${
        isMobile
          ? "bg-purple-50 dark:bg-purple-900/20"
          : "bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800"
      }`}>
        {!isMobile && (
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">AI機能 (Coming Soon)</span>
          </div>
        )}
        <p className="text-xs text-purple-600 dark:text-purple-400 mb-3">
          {isMobile ? "AI機能（高画質化・背景削除等）は近日公開予定" : "AI高画質化、背景削除、カラー化など"}
        </p>
        {!isMobile && (
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
        )}
      </div>
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
        />
      );
  }
}
