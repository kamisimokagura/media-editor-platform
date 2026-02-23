/**
 * RAW image converter utilities.
 * Loads libraw-wasm from /public/vendor at runtime to avoid Turbopack package graph issues.
 */

const RAW_EXTENSIONS = [
  ".cr2", ".cr3", // Canon
  ".nef", ".nrw", // Nikon
  ".arw", ".sr2", ".srf", // Sony
  ".dng", // Adobe DNG
  ".rw2", // Panasonic
  ".orf", // Olympus
  ".raf", // Fuji
  ".pef", // Pentax
  ".srw", // Samsung
  ".raw", // Generic RAW
  ".3fr", // Hasselblad
  ".kdc", ".dcr", // Kodak
  ".mrw", // Minolta
  ".rwl", // Leica
  ".x3f", // Sigma
  ".erf", // Epson
];

const RAW_MIME_TYPES = [
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

const LIBRAW_MODULE_PATH = "/vendor/libraw-wasm/index.js";

type RawImageData = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

type LibRawInstance = {
  open(input: Uint8Array): Promise<void>;
  imageData(): Promise<RawImageData>;
  close(): void;
};

type LibRawConstructor = new () => LibRawInstance;

let libRawLoaderPromise: Promise<LibRawConstructor> | null = null;

async function loadLibRaw(): Promise<LibRawConstructor> {
  if (typeof window === "undefined") {
    throw new Error("libraw-wasm can only be loaded in the browser");
  }

  if (!libRawLoaderPromise) {
    const moduleUrl = new URL(LIBRAW_MODULE_PATH, window.location.origin).toString();
    libRawLoaderPromise = import(/* webpackIgnore: true */ moduleUrl).then((mod) => {
      const maybeCtor = (mod as { default?: unknown }).default;
      if (typeof maybeCtor !== "function") {
        throw new Error("Invalid libraw module: default export is missing");
      }
      return maybeCtor as LibRawConstructor;
    });
  }

  return libRawLoaderPromise;
}

/**
 * Detect whether a file is a RAW format by MIME type or extension.
 */
export function isRawFile(file: File): boolean {
  if (RAW_MIME_TYPES.includes(file.type)) {
    return true;
  }
  const extension = "." + (file.name.split(".").pop()?.toLowerCase() || "");
  return RAW_EXTENSIONS.includes(extension);
}

/**
 * Convert RAW file into PNG Blob.
 */
export async function convertRawToBlob(file: File): Promise<Blob> {
  const LibRaw = await loadLibRaw();

  const arrayBuffer = await file.arrayBuffer();
  const raw = new LibRaw();

  try {
    await raw.open(new Uint8Array(arrayBuffer));
    const imageData = await raw.imageData();

    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas context not available");
    }

    const canvasImageData = ctx.createImageData(imageData.width, imageData.height);
    canvasImageData.data.set(imageData.data);
    ctx.putImageData(canvasImageData, 0, 0);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to convert RAW to PNG blob"));
          }
        },
        "image/png"
      );
    });
  } finally {
    raw.close();
  }
}

/**
 * Convert RAW file into a browser-compatible PNG file.
 */
export async function ensureBrowserCompatibleRawImage(file: File): Promise<File> {
  if (!isRawFile(file)) {
    return file;
  }

  const blob = await convertRawToBlob(file);
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.png`, { type: "image/png" });
}
