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

  const getAllowedTypes = () => {
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
  };

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
    [accept, maxFiles]
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
        relative isolate group cursor-pointer overflow-hidden w-full
        border-2 border-dashed rounded-2xl
        transition-all duration-300 ease-out
        bg-white dark:bg-dark-800
        ${isDragging
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]"
          : "border-gray-300 dark:border-dark-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-dark-800/50"
        }
        ${className}
      `}
    >
      {/* Gradient border effect on hover */}
      <div className={`
        pointer-events-none absolute inset-[2px] rounded-[14px]
        bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20
        opacity-0 transition-opacity duration-300
        ${isDragging ? "opacity-100" : "group-hover:opacity-70"}
      `} />

      <input
        type="file"
        accept={acceptString}
        multiple={multiple}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />

      <div className="relative flex w-full flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
        {/* Animated icon */}
        <div className={`
          relative mb-6 transition-transform duration-300
          ${isDragging ? "scale-110 -translate-y-2" : "group-hover:scale-105"}
        `}>
          {/* Glow effect */}
          <div className={`
            absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur-xl
            transition-opacity duration-300
            ${isDragging ? "opacity-50" : "opacity-0 group-hover:opacity-30"}
          `} />

          {/* Icon container */}
          <div className={`
            relative w-16 h-16 rounded-2xl flex items-center justify-center
            transition-all duration-300
            ${isDragging
              ? "bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30"
              : "bg-gray-100 dark:bg-dark-700 group-hover:bg-gradient-to-br group-hover:from-blue-500 group-hover:to-purple-600"
            }
          `}>
            <svg
              className={`
                w-8 h-8 transition-all duration-300
                ${isDragging
                  ? "text-white"
                  : "text-gray-400 dark:text-gray-500 group-hover:text-white"
                }
              `}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
        </div>

        {/* Text */}
        <div className="text-center">
          <p className={`
            mb-2 text-base font-medium transition-colors duration-300
            ${isDragging
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-700 dark:text-gray-300"
            }
          `}>
            <span className="font-semibold">ファイルをドロップ</span>
            <span className="text-gray-500 dark:text-gray-400"> または </span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">クリックして選択</span>
          </p>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {accept === "video" && "MP4, WebM, MOV, AVI, MKV, FLV, WMV, MPEG, 3GP等"}
            {accept === "image" && "PNG, JPG, GIF, WebP, SVG, HEIC, RAW, BMP, TIFF, AVIF等"}
            {accept === "audio" && "MP3, WAV, OGG, AAC, FLAC, M4A等"}
            {accept === "all" && "動画・画像・音声ファイル対応（iOS写真・RAW含む）"}
          </p>

          {/* File size badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-dark-700 rounded-full">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              最大 {MAX_FILE_SIZE_MB}MB
            </span>
          </div>
        </div>

        {/* Animated upload hint when dragging */}
        {isDragging && (
          <div className="absolute inset-[2px] flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/20 rounded-[14px]">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                ここにドロップ
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
