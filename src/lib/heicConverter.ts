/**
 * HEIC/HEIF画像変換ユーティリティ
 * iOS写真(HEIC/HEIF)をブラウザ互換のPNG形式に変換
 * heic2anyはdynamic importで遅延読み込み
 */

const HEIC_EXTENSIONS = [".heic", ".heif"];
const HEIC_MIME_TYPES = ["image/heic", "image/heif"];

/**
 * ファイルがHEIC/HEIFかどうかを判定
 * MIME typeと拡張子の両方でチェック（一部OSではMIMEが空やoctet-streamになるため）
 */
export function isHeicFile(file: File): boolean {
  if (HEIC_MIME_TYPES.includes(file.type)) {
    return true;
  }
  const extension = "." + (file.name.split(".").pop()?.toLowerCase() || "");
  return HEIC_EXTENSIONS.includes(extension);
}

/**
 * HEIC/HEIFファイルをPNG Blobに変換
 */
export async function convertHeicToBlob(file: File): Promise<Blob> {
  const heic2any = (await import("heic2any")).default;

  const result = await heic2any({
    blob: file,
    toType: "image/png",
    quality: 1,
  });

  // heic2anyはBlobまたはBlob[]を返す可能性がある
  if (Array.isArray(result)) {
    return result[0];
  }
  return result;
}

/**
 * HEIC/HEIFファイルをブラウザ互換のFileオブジェクトに変換
 * HEIC/HEIFでなければそのまま返す
 */
export async function ensureBrowserCompatibleImage(file: File): Promise<File> {
  if (!isHeicFile(file)) {
    return file;
  }

  const blob = await convertHeicToBlob(file);
  const baseName = file.name.replace(/\.(heic|heif)$/i, "");
  return new File([blob], `${baseName}.png`, { type: "image/png" });
}
