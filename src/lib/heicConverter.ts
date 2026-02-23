/**
 * HEIC/HEIF converter utilities.
 * Uses runtime script loading from /public/vendor to avoid Turbopack package graph issues.
 */

const HEIC_EXTENSIONS = [".heic", ".heif"];
const HEIC_MIME_TYPES = ["image/heic", "image/heif"];
const HEIC2ANY_SCRIPT_URL = "/vendor/heic2any/heic2any.min.js";

type Heic2AnyResult = Blob | Blob[];
type Heic2AnyConverter = (options: {
  blob: Blob;
  toType: string;
  quality: number;
}) => Promise<Heic2AnyResult>;

let heic2AnyLoaderPromise: Promise<Heic2AnyConverter> | null = null;

function getHeic2AnyFromWindow(): Heic2AnyConverter | null {
  if (typeof window === "undefined") {
    return null;
  }
  const maybeConverter = (window as Window & { heic2any?: unknown }).heic2any;
  return typeof maybeConverter === "function" ? (maybeConverter as Heic2AnyConverter) : null;
}

async function loadHeic2Any(): Promise<Heic2AnyConverter> {
  const existing = getHeic2AnyFromWindow();
  if (existing) {
    return existing;
  }

  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("heic2any can only be loaded in the browser");
  }

  if (!heic2AnyLoaderPromise) {
    heic2AnyLoaderPromise = new Promise<Heic2AnyConverter>((resolve, reject) => {
      let script = document.querySelector<HTMLScriptElement>('script[data-vendor="heic2any"]');
      if (!script) {
        script = document.createElement("script");
        script.src = HEIC2ANY_SCRIPT_URL;
        script.async = true;
        script.dataset.vendor = "heic2any";
        document.head.appendChild(script);
      }

      const handleLoaded = () => {
        const converter = getHeic2AnyFromWindow();
        if (!converter) {
          reject(new Error("heic2any loaded but window.heic2any is missing"));
          return;
        }
        resolve(converter);
      };

      if (getHeic2AnyFromWindow()) {
        handleLoaded();
        return;
      }

      script.addEventListener("load", handleLoaded, { once: true });
      script.addEventListener(
        "error",
        () => reject(new Error(`Failed to load ${HEIC2ANY_SCRIPT_URL}`)),
        { once: true }
      );
    });
  }

  return heic2AnyLoaderPromise;
}

/**
 * Detect whether a file is HEIC/HEIF by MIME type or extension.
 */
export function isHeicFile(file: File): boolean {
  if (HEIC_MIME_TYPES.includes(file.type)) {
    return true;
  }
  const extension = "." + (file.name.split(".").pop()?.toLowerCase() || "");
  return HEIC_EXTENSIONS.includes(extension);
}

/**
 * Convert HEIC/HEIF file into PNG Blob.
 */
export async function convertHeicToBlob(file: File): Promise<Blob> {
  const heic2any = await loadHeic2Any();

  const result = await heic2any({
    blob: file,
    toType: "image/png",
    quality: 1,
  });

  if (Array.isArray(result)) {
    return result[0];
  }
  return result;
}

/**
 * Convert HEIC/HEIF file into a browser-compatible PNG file.
 */
export async function ensureBrowserCompatibleImage(file: File): Promise<File> {
  if (!isHeicFile(file)) {
    return file;
  }

  const blob = await convertHeicToBlob(file);
  const baseName = file.name.replace(/\.(heic|heif)$/i, "");
  return new File([blob], `${baseName}.png`, { type: "image/png" });
}
