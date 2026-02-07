// Media Types
export type MediaType = "video" | "image" | "audio";

export interface MediaFile {
  id: string;
  name: string;
  type: MediaType;
  mimeType: string;
  size: number;
  url: string;
  blob?: Blob;
  duration?: number; // For video/audio
  width?: number;
  height?: number;
  thumbnail?: string;
  createdAt: Date;
}

// Project Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
  timeline: Timeline;
  settings: ProjectSettings;
}

export interface ProjectSettings {
  width: number;
  height: number;
  frameRate: number;
  outputFormat: OutputFormat;
}

export type OutputFormat = "mp4" | "webm" | "gif" | "png" | "jpg" | "webp" | "avif" | "bmp" | "mov" | "avi" | "mkv";

// Timeline Types
export interface Timeline {
  tracks: Track[];
  duration: number;
  currentTime: number;
}

export interface Track {
  id: string;
  name: string;
  type: "video" | "audio" | "image";
  clips: Clip[];
  muted: boolean;
  locked: boolean;
  visible: boolean;
}

export interface Clip {
  id: string;
  mediaId: string;
  name: string;
  startTime: number; // Position on timeline
  duration: number;
  inPoint: number; // Start point in source media
  outPoint: number; // End point in source media
  effects: Effect[];
}

// Effects Types
export interface Effect {
  id: string;
  type: EffectType;
  parameters: EffectParameters;
  enabled: boolean;
}

export type EffectType =
  | "brightness"
  | "contrast"
  | "saturation"
  | "blur"
  | "sharpen"
  | "rotate"
  | "flip"
  | "crop"
  | "fade";

export interface EffectParameters {
  [key: string]: number | string | boolean;
}

// Image Adjustment Types
export interface ImageAdjustments {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  exposure: number; // -100 to 100
  highlights: number; // -100 to 100
  shadows: number; // -100 to 100
  sharpness: number; // 0 to 100
  blur: number; // 0 to 100
  rotation: number; // 0 to 360
  flipHorizontal: boolean;
  flipVertical: boolean;
}

export const DEFAULT_IMAGE_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  sharpness: 0,
  blur: 0,
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
};

// FFmpeg Types
export interface FFmpegProgress {
  progress: number; // 0-100
  time: number;
  speed: number;
}

export interface ConversionOptions {
  format: OutputFormat;
  quality?: number; // 1-100
  width?: number;
  height?: number;
  fps?: number;
  bitrate?: string;
  codec?: string;
}

// Processing Status
export type ProcessingStatus =
  | "idle"
  | "loading"
  | "processing"
  | "complete"
  | "error";

export interface ProcessingState {
  status: ProcessingStatus;
  progress: number;
  message?: string;
  error?: string;
}

// User Types (for NextAuth)
export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  createdAt: Date;
}

// Toast Notification Types
export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// File validation
export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/x-flv",
  "video/x-ms-wmv",
  "video/mpeg",
  "video/3gpp",
  "video/mp2t",
  "video/x-m4v",
  "video/ogg",
];

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/heic",
  "image/heif",
  "image/bmp",
  "image/tiff",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/avif",
  "image/x-canon-cr2",
  "image/x-canon-cr3",
  "image/x-nikon-nef",
  "image/x-sony-arw",
  "image/x-adobe-dng",
  "image/x-panasonic-rw2",
  "image/x-olympus-orf",
  "image/x-fuji-raf",
  "image/x-pentax-pef",
  "image/x-samsung-srw",
  "image/x-dcraw",
];

export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/aac",
  "audio/flac",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aiff",
  "audio/x-ms-wma",
];

export const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB (FFmpeg WASM limit)
export const MAX_FILE_SIZE_MB = 2048;
