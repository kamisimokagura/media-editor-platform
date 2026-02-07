"use client";

import { useCallback, useEffect, useState } from "react";
import { Header, Sidebar } from "@/components/layout";
import { VideoPreview, Timeline } from "@/components/editor";
import { DropZone, ProgressBar } from "@/components/ui";
import { useEditorStore } from "@/stores/editorStore";
import { useFFmpeg } from "@/hooks/useFFmpeg";
import { toast } from "@/stores/toastStore";
import { v4 as uuidv4 } from "uuid";
import { isHeicFile, ensureBrowserCompatibleImage } from "@/lib/heicConverter";
import { isRawFile, ensureBrowserCompatibleRawImage } from "@/lib/rawConverter";
import type { MediaFile, MediaType } from "@/types";

export default function EditorPage() {
  const {
    project,
    createProject,
    addMediaFile,
    processingState,
    selectMedia,
  } = useEditorStore();

  const { loadFFmpeg, generateThumbnail, ffmpegLoaded } = useFFmpeg();
  const [ffmpegError, setFfmpegError] = useState<string | null>(null);
  const [isLoadingFFmpeg, setIsLoadingFFmpeg] = useState(false);

  // Initialize FFmpeg on mount
  useEffect(() => {
    if (!ffmpegLoaded && !isLoadingFFmpeg && !ffmpegError) {
      setIsLoadingFFmpeg(true);
      loadFFmpeg()
        .then(() => {
          setIsLoadingFFmpeg(false);
        })
        .catch((error) => {
          console.error("FFmpeg load error:", error);
          setFfmpegError(
            "FFmpegの読み込みに失敗しました。ブラウザがSharedArrayBufferをサポートしていない可能性があります。Chrome、Firefox、またはEdgeの最新版をお試しください。"
          );
          setIsLoadingFFmpeg(false);
        });
    }
  }, [ffmpegLoaded, loadFFmpeg, isLoadingFFmpeg, ffmpegError]);

  // Create project if none exists
  useEffect(() => {
    if (!project) {
      createProject("新規プロジェクト");
    }
  }, [project, createProject]);

  // Handle file drops
  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      for (let file of files) {
        // HEIC/RAW変換
        if (isHeicFile(file)) {
          toast.info("HEIC画像を変換中...");
          file = await ensureBrowserCompatibleImage(file);
        } else if (isRawFile(file)) {
          toast.info("RAW画像を変換中...");
          file = await ensureBrowserCompatibleRawImage(file);
        }

        const mediaType: MediaType = file.type.startsWith("video/")
          ? "video"
          : file.type.startsWith("audio/")
          ? "audio"
          : "image";

        const url = URL.createObjectURL(file);

        const mediaFile: MediaFile = {
          id: uuidv4(),
          name: file.name,
          type: mediaType,
          mimeType: file.type,
          size: file.size,
          url,
          blob: file,
          createdAt: new Date(),
        };

        // Get video metadata
        if (mediaType === "video") {
          const video = document.createElement("video");
          video.preload = "metadata";
          video.src = url;

          await new Promise<void>((resolve) => {
            video.onloadedmetadata = () => {
              mediaFile.duration = video.duration;
              mediaFile.width = video.videoWidth;
              mediaFile.height = video.videoHeight;
              resolve();
            };
            video.onerror = () => resolve();
          });

          // Generate thumbnail
          if (ffmpegLoaded) {
            const thumbnail = await generateThumbnail(file);
            if (thumbnail) {
              mediaFile.thumbnail = thumbnail;
            }
          }
        }

        // Get image metadata
        if (mediaType === "image") {
          const img = new Image();
          img.src = url;

          await new Promise<void>((resolve) => {
            img.onload = () => {
              mediaFile.width = img.naturalWidth;
              mediaFile.height = img.naturalHeight;
              mediaFile.thumbnail = url;
              resolve();
            };
            img.onerror = () => resolve();
          });
        }

        // Get audio metadata
        if (mediaType === "audio") {
          const audio = document.createElement("audio");
          audio.src = url;

          await new Promise<void>((resolve) => {
            audio.onloadedmetadata = () => {
              mediaFile.duration = audio.duration;
              resolve();
            };
            audio.onerror = () => resolve();
          });
        }

        addMediaFile(mediaFile);
        selectMedia(mediaFile.id);
      }
    },
    [addMediaFile, selectMedia, ffmpegLoaded, generateThumbnail]
  );

  // Retry FFmpeg loading
  const handleRetryFFmpeg = () => {
    setFfmpegError(null);
    setIsLoadingFFmpeg(true);
    loadFFmpeg()
      .then(() => {
        setIsLoadingFFmpeg(false);
      })
      .catch((error) => {
        console.error("FFmpeg load error:", error);
        setFfmpegError(
          "FFmpegの読み込みに失敗しました。ブラウザがSharedArrayBufferをサポートしていない可能性があります。"
        );
        setIsLoadingFFmpeg(false);
      });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-dark-950">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content - centered with proper spacing */}
        <div className="flex-1 flex flex-col p-6 lg:p-8 gap-6 overflow-hidden">
          {/* Top section: Preview and Drop zone */}
          <div className="flex-1 flex gap-6 min-h-0">
            {/* Preview - centered */}
            <div className="flex-1 min-w-0 flex items-center justify-center">
              <div className="w-full h-full max-w-5xl">
                <VideoPreview />
              </div>
            </div>

            {/* Quick upload - improved spacing */}
            <div className="w-80 lg:w-96 flex flex-col gap-6">
              <DropZone
                onFilesSelected={handleFilesSelected}
                accept="all"
                className="flex-1 bg-white dark:bg-dark-800 rounded-2xl shadow-lg"
              />

              {/* FFmpeg status - enhanced with error handling */}
              <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      ffmpegLoaded
                        ? "bg-green-500 shadow-lg shadow-green-500/30"
                        : ffmpegError
                        ? "bg-red-500 shadow-lg shadow-red-500/30"
                        : "bg-yellow-500 animate-pulse shadow-lg shadow-yellow-500/30"
                    }`}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {ffmpegLoaded
                      ? "FFmpeg 準備完了"
                      : ffmpegError
                      ? "エラー発生"
                      : "FFmpeg 読み込み中..."}
                  </span>
                </div>

                {/* Error message and retry button */}
                {ffmpegError && (
                  <div className="mt-4">
                    <p className="text-xs text-red-600 dark:text-red-400 mb-4 leading-relaxed">
                      {ffmpegError}
                    </p>
                    <button
                      onClick={handleRetryFFmpeg}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20"
                    >
                      再試行
                    </button>
                  </div>
                )}

                {/* Loading indicator */}
                {isLoadingFFmpeg && !ffmpegError && (
                  <div className="mt-4">
                    <div className="w-full h-2 bg-gray-200 dark:bg-dark-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      初回読み込みには少し時間がかかります...
                    </p>
                  </div>
                )}

                {/* Processing progress */}
                {processingState.status === "processing" && (
                  <div className="mt-4">
                    <ProgressBar
                      progress={processingState.progress}
                      message={processingState.message}
                    />
                  </div>
                )}

                {/* Success state */}
                {ffmpegLoaded && processingState.status !== "processing" && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    動画処理の準備ができました
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Bottom section: Timeline - improved spacing */}
          <div className="h-64 min-h-[200px] bg-white dark:bg-dark-800 rounded-2xl shadow-lg overflow-hidden">
            <Timeline />
          </div>
        </div>
      </div>
    </div>
  );
}
