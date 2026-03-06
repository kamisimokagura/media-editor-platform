"use client";

import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Header, Sidebar } from "@/components/layout";
import { VideoPreview, Timeline } from "@/components/editor";
import { Button, DropZone, ProgressBar } from "@/components/ui";
import { useEditorStore } from "@/stores/editorStore";
import { useFFmpeg } from "@/hooks/useFFmpeg";
import { toast } from "@/stores/toastStore";
import { isHeicFile, ensureBrowserCompatibleImage } from "@/lib/heicConverter";
import { isRawFile, ensureBrowserCompatibleRawImage } from "@/lib/rawConverter";
import { ANALYTICS_EVENTS, trackClientEvent, trackPageView } from "@/lib/analytics/client";
import type { MediaFile, MediaType } from "@/types";

function getSharedArrayBufferSupportMessage(): string | null {
  if (typeof window === "undefined") return null;

  if (typeof SharedArrayBuffer === "undefined") {
    return "SharedArrayBuffer is not available in this browser. Use Chrome / Firefox / Edge latest versions.";
  }

  if (!window.crossOriginIsolated) {
    return "Cross-origin isolation is disabled (COOP/COEP). Check deployment headers and reload.";
  }

  return null;
}

interface FfmpegStatusCardProps {
  ffmpegLoaded: boolean;
  ffmpegError: string | null;
  isLoadingFFmpeg: boolean;
  processingState: {
    status: string;
    progress: number;
    message?: string;
  };
  onRetry: () => void;
}

function FfmpegStatusCard({
  ffmpegLoaded,
  ffmpegError,
  isLoadingFFmpeg,
  processingState,
  onRetry,
}: FfmpegStatusCardProps) {
  return (
    <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-[var(--shadow-lg)]">
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
        <span className="text-sm font-medium text-[var(--color-text-muted)]">
          {ffmpegLoaded ? "FFmpeg ready" : ffmpegError ? "FFmpeg load failed" : "Loading FFmpeg..."}
        </span>
      </div>

      {ffmpegError && (
        <div className="mt-4">
          <p className="text-xs text-red-500 mb-4 leading-relaxed">{ffmpegError}</p>
          <Button variant="primary" onClick={onRetry} className="w-full">
            Retry
          </Button>
        </div>
      )}

      {isLoadingFFmpeg && !ffmpegError && (
        <div className="mt-4">
          <div className="w-full h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-accent)] rounded-full animate-pulse"
              style={{ width: "60%" }}
            />
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            First load can take a little time depending on your network.
          </p>
        </div>
      )}

      {processingState.status === "processing" && (
        <div className="mt-4">
          <ProgressBar progress={processingState.progress} message={processingState.message} />
        </div>
      )}

      {ffmpegLoaded && processingState.status !== "processing" && (
        <p className="text-xs text-[var(--color-text-muted)] mt-2">Ready for local browser-side processing.</p>
      )}
    </div>
  );
}

export default function EditorPage() {
  const { project, createProject, mediaFiles, addMediaFile, processingState, selectMedia } =
    useEditorStore();
  const { loadFFmpeg, generateThumbnail, ffmpegLoaded } = useFFmpeg();

  const [ffmpegError, setFfmpegError] = useState<string | null>(null);
  const [isLoadingFFmpeg, setIsLoadingFFmpeg] = useState(false);
  const [hasAttemptedAutoLoad, setHasAttemptedAutoLoad] = useState(false);

  const hasMediaFiles = mediaFiles.length > 0;

  const runFfmpegLoad = useCallback(async () => {
    setIsLoadingFFmpeg(true);
    setFfmpegError(null);

    const supportMessage = getSharedArrayBufferSupportMessage();

    try {
      await loadFFmpeg();
      setFfmpegError(null);
    } catch (error) {
      console.error("FFmpeg load error:", error);
      setFfmpegError(
        supportMessage ??
          "Failed to load FFmpeg. Check network and browser isolation settings, then retry."
      );
    } finally {
      setIsLoadingFFmpeg(false);
    }
  }, [loadFFmpeg]);

  useEffect(() => {
    if (!project) {
      createProject("New Project");
    }
  }, [project, createProject]);

  useEffect(() => {
    void trackPageView("/editor");
  }, []);

  useEffect(() => {
    if (ffmpegLoaded || isLoadingFFmpeg || hasAttemptedAutoLoad) {
      return;
    }

    setHasAttemptedAutoLoad(true);
    void runFfmpegLoad();
  }, [ffmpegLoaded, isLoadingFFmpeg, hasAttemptedAutoLoad, runFfmpegLoad]);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      for (let file of files) {
        if (isHeicFile(file)) {
          toast.info("Converting HEIC image...");
          file = await ensureBrowserCompatibleImage(file);
        } else if (isRawFile(file)) {
          toast.info("Converting RAW image...");
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

        void trackClientEvent({
          eventName: ANALYTICS_EVENTS.FILE_SELECTED,
          pagePath: "/editor",
          eventParams: {
            media_type: mediaType,
            mime_type: file.type,
            file_name: file.name,
            file_size_bytes: file.size,
          },
        });

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

          if (ffmpegLoaded) {
            const thumbnail = await generateThumbnail(file);
            if (thumbnail) {
              mediaFile.thumbnail = thumbnail;
            }
          }
        }

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
    [addMediaFile, ffmpegLoaded, generateThumbnail, selectMedia]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <div className="hidden xl:block">
          <Sidebar />
        </div>

        <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 gap-4 sm:gap-6 overflow-hidden">
          {!hasMediaFiles ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="w-full max-w-3xl">
                <DropZone
                  onFilesSelected={handleFilesSelected}
                  accept="all"
                  className="min-h-[320px] bg-[var(--color-surface)] rounded-2xl shadow-[var(--shadow-lg)]"
                />
              </div>
              <div className="w-full max-w-3xl">
                <FfmpegStatusCard
                  ffmpegLoaded={ffmpegLoaded}
                  ffmpegError={ffmpegError}
                  isLoadingFFmpeg={isLoadingFFmpeg}
                  processingState={processingState}
                  onRetry={() => {
                    void runFfmpegLoad();
                  }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0 grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_360px] gap-4 sm:gap-6">
                <div className="min-w-0 flex items-center justify-center">
                  <div className="w-full h-full max-w-5xl">
                    <VideoPreview />
                  </div>
                </div>

                <div className="flex flex-col gap-4 sm:gap-6">
                  <DropZone
                    onFilesSelected={handleFilesSelected}
                    accept="all"
                    className="min-h-[260px] bg-[var(--color-surface)] rounded-2xl shadow-[var(--shadow-lg)]"
                  />
                  <FfmpegStatusCard
                    ffmpegLoaded={ffmpegLoaded}
                    ffmpegError={ffmpegError}
                    isLoadingFFmpeg={isLoadingFFmpeg}
                    processingState={processingState}
                    onRetry={() => {
                      void runFfmpegLoad();
                    }}
                  />
                </div>
              </div>

              <div className="h-56 sm:h-64 min-h-[200px] bg-[var(--color-surface)] rounded-2xl shadow-[var(--shadow-lg)] overflow-hidden">
                <Timeline />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
