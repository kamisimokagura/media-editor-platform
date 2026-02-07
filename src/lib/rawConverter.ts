/**
 * RAW画像変換ユーティリティ
 * デジタルカメラのRAWファイル(CR2, NEF, ARW, DNG等)をブラウザ互換のPNG形式に変換
 * libraw-wasmはdynamic importで遅延読み込み
 */

const RAW_EXTENSIONS = [
  ".cr2", ".cr3",     // Canon
  ".nef", ".nrw",     // Nikon
  ".arw", ".sr2", ".srf", // Sony
  ".dng",             // Adobe DNG
  ".rw2",             // Panasonic
  ".orf",             // Olympus
  ".raf",             // Fuji
  ".pef",             // Pentax
  ".srw",             // Samsung
  ".raw",             // Generic RAW
  ".3fr",             // Hasselblad
  ".kdc", ".dcr",     // Kodak
  ".mrw",             // Minolta
  ".rwl",             // Leica
  ".x3f",             // Sigma
  ".erf",             // Epson
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

/**
 * ファイルがRAW画像かどうかを判定
 * MIME typeと拡張子の両方でチェック
 */
export function isRawFile(file: File): boolean {
  if (RAW_MIME_TYPES.includes(file.type)) {
    return true;
  }
  const extension = "." + (file.name.split(".").pop()?.toLowerCase() || "");
  return RAW_EXTENSIONS.includes(extension);
}

/**
 * RAWファイルをPNG Blobに変換
 * libraw-wasmを使用してデコード後、Canvasで画像生成
 */
export async function convertRawToBlob(file: File): Promise<Blob> {
  const LibRaw = (await import("libraw-wasm")).default;

  const arrayBuffer = await file.arrayBuffer();
  const raw = new LibRaw();

  try {
    await raw.open(new Uint8Array(arrayBuffer));
    const imageData = await raw.imageData();

    // Canvas経由でPNG Blobに変換
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
 * RAWファイルをブラウザ互換のFileオブジェクトに変換
 * RAWでなければそのまま返す
 */
export async function ensureBrowserCompatibleRawImage(file: File): Promise<File> {
  if (!isRawFile(file)) {
    return file;
  }

  const blob = await convertRawToBlob(file);
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.png`, { type: "image/png" });
}
