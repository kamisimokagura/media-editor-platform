"use client";

import { useCallback, useState, DragEvent } from "react";
import {
  ALLOWED_VIDEO_TYPES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_AUDIO_TYPES,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB,
} from "@/types";
import { toast } from "@/stores/toastStore";
import { UploadSimple, FileText } from "@phosphor-icons/react";

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: "video" | "image" | "audio" | "all";
  multiple?: boolean;
  maxFiles?: number;
  className?: string;
}

export function DropZone({
  onFilesSelected,
  accept = "all",
  multiple = true,
  maxFiles = 10,
  className = "",
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const getAllowedTypes = useCallback(() => {
    switch (accept) {
      case "video":
        return ALLOWED_VIDEO_TYPES;
      case "image":
        return ALLOWED_IMAGE_TYPES;
      case "audio":
        return ALLOWED_AUDIO_TYPES;
      default:
        return [...ALLOWED_VIDEO_TYPES, ...ALLOWED_IMAGE_TYPES, ...ALLOWED_AUDIO_TYPES];
    }
  }, [accept]);

  const validateFiles = useCallback(
    (files: File[]): File[] => {
      const allowedTypes = getAllowedTypes();
      const validFiles: File[] = [];

      for (const file of files) {
        // Check file type (with extension fallback for HEIC/RAW files)
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        const heicExtensions = ["heic", "heif"];
        const rawExtensions = [
          "cr2", "cr3", "nef", "nrw", "arw", "sr2", "srf", "dng", "rw2",
          "orf", "raf", "pef", "srw", "raw", "3fr", "kdc", "dcr", "mrw",
          "rwl", "x3f", "erf",
        ];
        const isAllowedByExt = heicExtensions.includes(ext) || rawExtensions.includes(ext);

        if (!allowedTypes.includes(file.type) && !isAllowedByExt) {
          toast.error(`${file.name}: サポートされていないファイル形式です`);
          continue;
        }

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
          toast.error(
            `${file.name}: ファイルサイズが大きすぎます (最大: ${MAX_FILE_SIZE_MB}MB)`
          );
          continue;
        }

        validFiles.push(file);

        if (validFiles.length >= maxFiles) {
          toast.warning(`最大${maxFiles}ファイルまで選択できます`);
          break;
        }
      }

      return validFiles;
    },
    [getAllowedTypes, maxFiles]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const validFiles = validateFiles(files);

      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    },
    [validateFiles, onFilesSelected]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      const validFiles = validateFiles(files);

      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }

      // Reset input
      e.target.value = "";
    },
    [validateFiles, onFilesSelected]
  );

  // Build accept string with MIME types + file extensions for HEIC/RAW compatibility
  const extraExtensions = accept === "video" ? "" : ",.heic,.heif,.cr2,.cr3,.nef,.nrw,.arw,.dng,.rw2,.orf,.raf,.pef,.srw,.raw";
  const acceptString = getAllowedTypes().join(",") + (accept !== "audio" ? extraExtensions : "");

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative group cursor-pointer overflow-hidden w-full box-border
        border-2 border-dashed rounded-[var(--radius-lg)]
        transition-all duration-300 ease-out
        bg-[var(--color-surface)]
        ${isDragging
          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] scale-[1.02]"
          : "border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
        }
        ${className}
      `}
    >
      <input
        type="file"
        accept={acceptString}
        multiple={multiple}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />

      <div className="relative flex w-full flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
        {/* Icon */}
        <div className={`
          mb-6 transition-transform duration-300
          ${isDragging ? "scale-110 -translate-y-2" : "group-hover:scale-105"}
        `}>
          <UploadSimple
            size={48}
            weight="light"
            className={`
              transition-colors duration-300
              ${isDragging
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)]"
              }
            `}
          />
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="mb-2 text-base font-medium text-[var(--color-text-muted)]">
            <span className="font-semibold text-[var(--color-text)]">ファイルをドロップ</span>
            <span> または </span>
            <span className="font-semibold text-[var(--color-accent)]">クリックして選択</span>
          </p>

          <p className="text-sm text-[var(--color-text-muted)] mb-3">
            {accept === "video" && "MP4, WebM, MOV, AVI, MKV, FLV, WMV, MPEG, 3GP等"}
            {accept === "image" && "PNG, JPG, GIF, WebP, SVG, HEIC, RAW, BMP, TIFF, AVIF等"}
            {accept === "audio" && "MP3, WAV, OGG, AAC, FLAC, M4A等"}
            {accept === "all" && "動画・画像・音声ファイル対応（iOS写真・RAW含む）"}
          </p>

          {/* File size badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--color-accent-soft)] rounded-[var(--radius-full)]">
            <FileText size={16} className="text-[var(--color-text-muted)]" />
            <span className="text-xs text-[var(--color-text-muted)]">
              最大 {MAX_FILE_SIZE_MB}MB
            </span>
          </div>
        </div>

        {/* Animated upload hint when dragging */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-accent-soft)] rounded-[var(--radius-lg)]">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center animate-pulse">
                <UploadSimple size={32} weight="light" className="text-[var(--color-accent)]" />
              </div>
              <p className="text-lg font-semibold text-[var(--color-accent)]">
                ここにドロップ
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
