export type EditorTab = "adjust" | "crop" | "resize" | "filters" | "tools";
export type CropAspectRatio = "free" | "1:1" | "4:3" | "16:9" | "9:16" | "3:2";
export type FilterCategory = "all" | "basic" | "film" | "bw" | "color" | "creative";

export interface PresetFilter {
  id: string;
  name: string;
  category: FilterCategory;
  gradient: string;
  adjustments: Record<string, number>;
}

export const PRESET_FILTERS: PresetFilter[] = [
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

export const FILTER_CATEGORIES: { id: FilterCategory; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "basic", label: "基本" },
  { id: "film", label: "フィルム" },
  { id: "bw", label: "白黒" },
  { id: "color", label: "カラー" },
  { id: "creative", label: "クリエイティブ" },
];

export const ADJUSTMENT_CONTROLS = [
  { key: "brightness", label: "明るさ", min: -100, max: 100 },
  { key: "contrast", label: "コントラスト", min: -100, max: 100 },
  { key: "saturation", label: "彩度", min: -100, max: 100 },
  { key: "exposure", label: "露出", min: -100, max: 100 },
  { key: "highlights", label: "ハイライト", min: -100, max: 100 },
  { key: "shadows", label: "シャドウ", min: -100, max: 100 },
  { key: "sharpness", label: "シャープネス", min: 0, max: 100 },
  { key: "blur", label: "ぼかし", min: 0, max: 100 },
] as const;

export const CROP_ASPECT_RATIOS: CropAspectRatio[] = ["free", "1:1", "4:3", "16:9", "9:16", "3:2"];

export const CROP_RATIO_VALUES: Record<CropAspectRatio, number> = {
  "free": 1,
  "1:1": 1,
  "4:3": 4 / 3,
  "16:9": 16 / 9,
  "9:16": 9 / 16,
  "3:2": 3 / 2,
};

export const RESIZE_PRESETS = [
  { label: "50%", factor: 0.5 },
  { label: "75%", factor: 0.75 },
  { label: "150%", factor: 1.5 },
  { label: "200%", factor: 2 },
] as const;

export const EXPORT_FORMATS = ["png", "jpg", "webp", "avif", "bmp", "gif"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const FORMAT_DESCRIPTIONS: Record<ExportFormat, string> = {
  png: "可逆圧縮・透過対応。ロゴやイラストに最適",
  jpg: "高圧縮・写真向け。透過非対応",
  webp: "最新形式・高圧縮・透過対応。Web表示に最適",
  avif: "最新高圧縮形式。Chrome対応。最小ファイルサイズ",
  bmp: "非圧縮ビットマップ。互換性が高い",
  gif: "アニメーション対応。256色制限あり",
};
