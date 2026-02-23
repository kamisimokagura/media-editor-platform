/**
 * Security utilities for the MediaEditor platform
 *
 * This module provides security-related functions for input validation,
 * sanitization, and protection against common web vulnerabilities.
 */

// File type validation constants
export const SAFE_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

export const SAFE_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
];

export const SAFE_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
];

// Maximum file sizes (in bytes)
export const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2GB (FFmpeg WASM limit)
export const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Validates that a file type matches its extension and MIME type
 */
export function validateFileType(file: File): {
  valid: boolean;
  type: "image" | "video" | "audio" | null;
  error?: string;
} {
  const mimeType = file.type.toLowerCase();

  // Check image types
  if (SAFE_IMAGE_TYPES.includes(mimeType)) {
    if (file.size > MAX_IMAGE_SIZE) {
      return { valid: false, type: null, error: "画像ファイルサイズが大きすぎます (最大50MB)" };
    }
    return { valid: true, type: "image" };
  }

  // Check video types
  if (SAFE_VIDEO_TYPES.includes(mimeType)) {
    if (file.size > MAX_VIDEO_SIZE) {
      return { valid: false, type: null, error: "動画ファイルサイズが大きすぎます (最大2GB)" };
    }
    return { valid: true, type: "video" };
  }

  // Check audio types
  if (SAFE_AUDIO_TYPES.includes(mimeType)) {
    if (file.size > MAX_AUDIO_SIZE) {
      return { valid: false, type: null, error: "音声ファイルサイズが大きすぎます (最大100MB)" };
    }
    return { valid: true, type: "audio" };
  }

  return { valid: false, type: null, error: "サポートされていないファイル形式です" };
}

/**
 * Sanitizes a filename to prevent path traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  let sanitized = filename.replace(/^.*[\\/]/, "");

  // Remove special characters that could be dangerous
  sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split(".").pop() || "";
    const name = sanitized.slice(0, 255 - ext.length - 1);
    sanitized = `${name}.${ext}`;
  }

  // Ensure it doesn't start with a dot (hidden file)
  if (sanitized.startsWith(".")) {
    sanitized = "_" + sanitized.slice(1);
  }

  return sanitized || "unnamed_file";
}

/**
 * Validates and sanitizes a project name
 */
export function sanitizeProjectName(name: string): string {
  // Remove control characters and limit length
  let sanitized = name.replace(/[\x00-\x1f\x7f]/g, "").trim();

  if (sanitized.length === 0) {
    return "新規プロジェクト";
  }

  if (sanitized.length > 100) {
    sanitized = sanitized.slice(0, 100);
  }

  return sanitized;
}

/**
 * Check if the browser supports required features
 */
export function checkBrowserSupport(): {
  supported: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  // Check WebAssembly support
  if (typeof WebAssembly === "undefined") {
    missing.push("WebAssembly");
  }

  // Check SharedArrayBuffer support (required for FFmpeg.wasm)
  if (typeof SharedArrayBuffer === "undefined") {
    missing.push("SharedArrayBuffer");
  }

  // Check Blob and File API
  if (typeof Blob === "undefined" || typeof File === "undefined") {
    missing.push("File API");
  }

  // Check Canvas API
  if (typeof HTMLCanvasElement === "undefined") {
    missing.push("Canvas API");
  }

  // Check Web Workers
  if (typeof Worker === "undefined") {
    missing.push("Web Workers");
  }

  return {
    supported: missing.length === 0,
    missing,
  };
}

/**
 * Generate a secure random ID
 */
export function generateSecureId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Validate URL to prevent SSRF-like attacks (for future server-side use)
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http and https
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Rate limiting helper for client-side operations
 */
export function createRateLimiter(maxRequests: number, windowMs: number) {
  const requests: number[] = [];

  return {
    canProceed(): boolean {
      const now = Date.now();
      // Remove old requests outside the window
      while (requests.length > 0 && requests[0] < now - windowMs) {
        requests.shift();
      }

      if (requests.length >= maxRequests) {
        return false;
      }

      requests.push(now);
      return true;
    },

    getRemainingRequests(): number {
      const now = Date.now();
      while (requests.length > 0 && requests[0] < now - windowMs) {
        requests.shift();
      }
      return Math.max(0, maxRequests - requests.length);
    },
  };
}

/**
 * Content Security Policy helpers
 */
export const CSP_DIRECTIVES = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-eval'"], // unsafe-eval needed for FFmpeg.wasm
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "blob:", "data:"],
  "media-src": ["'self'", "blob:"],
  "connect-src": ["'self'", "https://unpkg.com"], // For FFmpeg.wasm CDN
  "worker-src": ["'self'", "blob:"],
  "object-src": ["'none'"],
  "frame-ancestors": ["'none'"],
};

export function generateCSPHeader(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
}
