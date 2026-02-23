"use client";

import { useCallback, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { useEditorStore } from "@/stores/editorStore";
import { toast } from "@/stores/toastStore";
import type { ConversionOptions, FFmpegProgress } from "@/types";

type FFmpegLoadConfig = Parameters<FFmpeg["load"]>[0];

interface CoreCandidate {
  name: string;
  coreURL: string;
  wasmURL: string;
}

interface LoadAttempt {
  label: string;
  getConfig: () => Promise<FFmpegLoadConfig>;
}

const CORE_CANDIDATES: CoreCandidate[] = [
  {
    name: "unpkg",
    coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",
    wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm",
  },
  {
    name: "jsdelivr",
    coreURL: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",
    wasmURL: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm",
  },
];

function createLoadAttempts(candidate: CoreCandidate): LoadAttempt[] {
  return [
    {
      label: `${candidate.name}-blob`,
      getConfig: async () => ({
        coreURL: await toBlobURL(candidate.coreURL, "text/javascript"),
        wasmURL: await toBlobURL(candidate.wasmURL, "application/wasm"),
      }),
    },
    {
      label: `${candidate.name}-direct`,
      getConfig: async () => ({
        coreURL: candidate.coreURL,
        wasmURL: candidate.wasmURL,
      }),
    },
  ];
}

function getBrowserSupportError(): string | null {
  if (typeof window === "undefined") return null;

  if (typeof SharedArrayBuffer === "undefined") {
    return "SharedArrayBuffer is not available. Use the latest Chrome, Firefox, or Edge.";
  }

  if (!window.crossOriginIsolated) {
    return "Cross-origin isolation is disabled (COOP/COEP). Check response headers and try again.";
  }

  return null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}

function fileDataToBlob(data: Uint8Array | string, mimeType: string): Blob {
  if (typeof data === "string") {
    return new Blob([data], { type: mimeType });
  }

  // Copy into ArrayBuffer to avoid SharedArrayBuffer-backed view issues.
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);
  return new Blob([buffer], { type: mimeType });
}

async function cleanupFiles(ffmpeg: FFmpeg, fileNames: string[]) {
  await Promise.allSettled(
    fileNames.map(async (name) => {
      if (!name) return;
      try {
        await ffmpeg.deleteFile(name);
      } catch {
        // Ignore cleanup failures.
      }
    })
  );
}

function getFileExt(name: string, fallback: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext && ext.length > 0 ? ext : fallback;
}

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const loadingPromiseRef = useRef<Promise<FFmpeg> | null>(null);
  const lastLoadErrorRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<FFmpegProgress>({
    progress: 0,
    time: 0,
    speed: 0,
  });

  const { ffmpegLoaded, setFfmpegLoaded, setProcessingState } = useEditorStore();

  const attachListeners = useCallback(
    (instance: FFmpeg) => {
      instance.on("progress", ({ progress: rawProgress, time }) => {
        const progressPercent = Math.max(0, Math.min(100, Math.round(rawProgress * 100)));
        setProgress({ progress: progressPercent, time, speed: 0 });
        setProcessingState({
          status: "processing",
          progress: progressPercent,
          message: `Processing... ${progressPercent}%`,
        });
      });
    },
    [setProcessingState]
  );

  const loadFFmpeg = useCallback(async () => {
    if (ffmpegRef.current && ffmpegLoaded) {
      return ffmpegRef.current;
    }

    if (loadingPromiseRef.current) {
      return loadingPromiseRef.current;
    }

    const loader = (async (): Promise<FFmpeg> => {
      setIsLoading(true);
      setProcessingState({ status: "loading", progress: 0, message: "Loading FFmpeg..." });

      try {
        const supportError = getBrowserSupportError();
        if (supportError) {
          throw new Error(supportError);
        }

        const attemptErrors: string[] = [];

        for (const candidate of CORE_CANDIDATES) {
          const attempts = createLoadAttempts(candidate);

          for (const attempt of attempts) {
            const instance = new FFmpeg();
            attachListeners(instance);

            try {
              const config = await attempt.getConfig();
              await instance.load(config);

              ffmpegRef.current = instance;
              setFfmpegLoaded(true);
              setProcessingState({ status: "idle", progress: 0, message: undefined, error: undefined });
              lastLoadErrorRef.current = null;

              toast.success("FFmpeg loaded");
              return instance;
            } catch (attemptError) {
              attemptErrors.push(`[${attempt.label}] ${getErrorMessage(attemptError)}`);
            }
          }
        }

        throw new Error(
          `Unable to load FFmpeg. ${attemptErrors.length > 0 ? attemptErrors.join(" | ") : ""}`.trim()
        );
      } catch (error) {
        const errorMessage = getErrorMessage(error);

        ffmpegRef.current = null;
        setFfmpegLoaded(false);
        setProcessingState({
          status: "error",
          progress: 0,
          error: "FFmpeg load failed",
          message: errorMessage,
        });

        if (lastLoadErrorRef.current !== errorMessage) {
          toast.error(errorMessage);
          lastLoadErrorRef.current = errorMessage;
        }

        throw error;
      } finally {
        setIsLoading(false);
      }
    })();

    loadingPromiseRef.current = loader;

    try {
      return await loader;
    } finally {
      loadingPromiseRef.current = null;
    }
  }, [attachListeners, ffmpegLoaded, setFfmpegLoaded, setProcessingState]);

  const convertVideo = useCallback(
    async (inputFile: File, options: ConversionOptions): Promise<Blob | null> => {
      let inputName = "";
      let outputName = "";

      try {
        const ffmpeg = await loadFFmpeg();
        const inputExt = getFileExt(inputFile.name, "mp4");
        const outputFormat = options.format || "mp4";

        inputName = `input_${Date.now()}.${inputExt}`;
        outputName = `output_${Date.now()}.${outputFormat}`;

        setProcessingState({
          status: "processing",
          progress: 0,
          message: "Converting video...",
        });

        await ffmpeg.writeFile(inputName, await fetchFile(inputFile));

        const args: string[] = ["-i", inputName];
        const filters: string[] = [];

        if (outputFormat === "webm") {
          args.push("-c:v", "libvpx-vp9", "-c:a", "libopus");
        } else if (outputFormat === "mp4") {
          args.push("-c:v", "libx264", "-c:a", "aac");
        } else if (outputFormat === "mov") {
          args.push("-c:v", "libx264", "-c:a", "aac", "-tag:v", "avc1");
        } else if (outputFormat === "avi") {
          args.push("-c:v", "libx264", "-c:a", "aac");
        } else if (outputFormat === "mkv") {
          args.push("-c:v", "libx264", "-c:a", "aac");
        } else if (outputFormat === "gif") {
          filters.push("fps=10");
          filters.push("scale=320:-1:flags=lanczos");
        }

        if (options.width && options.height) {
          filters.push(`scale=${options.width}:${options.height}`);
        }

        if (filters.length > 0) {
          args.push("-vf", filters.join(","));
        }

        if (options.quality && outputFormat !== "gif") {
          const crf = Math.round(51 - (options.quality / 100) * 51);
          args.push("-crf", crf.toString());
        }

        if (options.fps && outputFormat !== "gif") {
          args.push("-r", String(options.fps));
        }

        if (options.bitrate) {
          args.push("-b:v", options.bitrate);
        }

        args.push("-y", outputName);

        await ffmpeg.exec(args);

        const data = await ffmpeg.readFile(outputName);
        const mimeTypeMap: Record<string, string> = {
          mp4: "video/mp4",
          webm: "video/webm",
          gif: "image/gif",
          mov: "video/quicktime",
          avi: "video/x-msvideo",
          mkv: "video/x-matroska",
        };

        const blob = fileDataToBlob(data, mimeTypeMap[outputFormat] || "video/mp4");
        setProcessingState({ status: "complete", progress: 100, message: undefined });
        toast.success("Video conversion completed");
        return blob;
      } catch (error) {
        setProcessingState({
          status: "error",
          progress: 0,
          error: "Video conversion failed",
          message: getErrorMessage(error),
        });
        toast.error("Video conversion failed");
        return null;
      } finally {
        if (ffmpegRef.current) {
          await cleanupFiles(ffmpegRef.current, [inputName, outputName]);
        }
      }
    },
    [loadFFmpeg, setProcessingState]
  );

  const trimVideo = useCallback(
    async (inputFile: File, startTime: number, endTime: number): Promise<Blob | null> => {
      let inputName = "";
      let outputName = "";

      try {
        const ffmpeg = await loadFFmpeg();
        const ext = getFileExt(inputFile.name, "mp4");

        inputName = `input_${Date.now()}.${ext}`;
        outputName = `trimmed_${Date.now()}.${ext}`;

        setProcessingState({
          status: "processing",
          progress: 0,
          message: "Trimming video...",
        });

        await ffmpeg.writeFile(inputName, await fetchFile(inputFile));

        const duration = Math.max(0, endTime - startTime);
        await ffmpeg.exec([
          "-i",
          inputName,
          "-ss",
          String(startTime),
          "-t",
          String(duration),
          "-c",
          "copy",
          "-y",
          outputName,
        ]);

        const data = await ffmpeg.readFile(outputName);
        const blob = fileDataToBlob(data, inputFile.type || "video/mp4");

        setProcessingState({ status: "complete", progress: 100, message: undefined });
        toast.success("Video trim completed");
        return blob;
      } catch (error) {
        setProcessingState({
          status: "error",
          progress: 0,
          error: "Video trim failed",
          message: getErrorMessage(error),
        });
        toast.error("Video trim failed");
        return null;
      } finally {
        if (ffmpegRef.current) {
          await cleanupFiles(ffmpegRef.current, [inputName, outputName]);
        }
      }
    },
    [loadFFmpeg, setProcessingState]
  );

  const mergeVideos = useCallback(
    async (files: File[]): Promise<Blob | null> => {
      if (files.length < 2) {
        toast.error("Select at least 2 videos");
        return null;
      }

      let outputName = "";
      const inputNames: string[] = [];

      try {
        const ffmpeg = await loadFFmpeg();

        setProcessingState({
          status: "processing",
          progress: 0,
          message: "Merging videos...",
        });

        for (let i = 0; i < files.length; i++) {
          const ext = getFileExt(files[i].name, "mp4");
          const inputName = `input_${Date.now()}_${i}.${ext}`;
          inputNames.push(inputName);
          await ffmpeg.writeFile(inputName, await fetchFile(files[i]));
        }

        const concatText = inputNames.map((name) => `file '${name}'`).join("\n");
        await ffmpeg.writeFile("concat.txt", concatText);

        outputName = `merged_${Date.now()}.mp4`;
        await ffmpeg.exec([
          "-f",
          "concat",
          "-safe",
          "0",
          "-i",
          "concat.txt",
          "-c",
          "copy",
          "-y",
          outputName,
        ]);

        const data = await ffmpeg.readFile(outputName);
        const blob = fileDataToBlob(data, "video/mp4");

        setProcessingState({ status: "complete", progress: 100, message: undefined });
        toast.success("Video merge completed");
        return blob;
      } catch (error) {
        setProcessingState({
          status: "error",
          progress: 0,
          error: "Video merge failed",
          message: getErrorMessage(error),
        });
        toast.error("Video merge failed");
        return null;
      } finally {
        if (ffmpegRef.current) {
          await cleanupFiles(ffmpegRef.current, [...inputNames, "concat.txt", outputName]);
        }
      }
    },
    [loadFFmpeg, setProcessingState]
  );

  const extractAudio = useCallback(
    async (inputFile: File): Promise<Blob | null> => {
      let inputName = "";
      let outputName = "";

      try {
        const ffmpeg = await loadFFmpeg();
        const ext = getFileExt(inputFile.name, "mp4");

        inputName = `input_${Date.now()}.${ext}`;
        outputName = `audio_${Date.now()}.mp3`;

        setProcessingState({
          status: "processing",
          progress: 0,
          message: "Extracting audio...",
        });

        await ffmpeg.writeFile(inputName, await fetchFile(inputFile));
        await ffmpeg.exec([
          "-i",
          inputName,
          "-vn",
          "-acodec",
          "libmp3lame",
          "-q:a",
          "2",
          "-y",
          outputName,
        ]);

        const data = await ffmpeg.readFile(outputName);
        const blob = fileDataToBlob(data, "audio/mpeg");

        setProcessingState({ status: "complete", progress: 100, message: undefined });
        toast.success("Audio extraction completed");
        return blob;
      } catch (error) {
        setProcessingState({
          status: "error",
          progress: 0,
          error: "Audio extraction failed",
          message: getErrorMessage(error),
        });
        toast.error("Audio extraction failed");
        return null;
      } finally {
        if (ffmpegRef.current) {
          await cleanupFiles(ffmpegRef.current, [inputName, outputName]);
        }
      }
    },
    [loadFFmpeg, setProcessingState]
  );

  const generateThumbnail = useCallback(
    async (inputFile: File, time = 0): Promise<string | null> => {
      let inputName = "";
      let outputName = "";

      try {
        const ffmpeg = await loadFFmpeg();
        const ext = getFileExt(inputFile.name, "mp4");

        inputName = `input_${Date.now()}.${ext}`;
        outputName = `thumb_${Date.now()}.jpg`;

        await ffmpeg.writeFile(inputName, await fetchFile(inputFile));
        await ffmpeg.exec([
          "-i",
          inputName,
          "-ss",
          String(time),
          "-vframes",
          "1",
          "-vf",
          "scale=320:-1",
          "-y",
          outputName,
        ]);

        const data = await ffmpeg.readFile(outputName);
        const blob = fileDataToBlob(data, "image/jpeg");
        return URL.createObjectURL(blob);
      } catch (error) {
        console.error("Thumbnail generation failed:", error);
        return null;
      } finally {
        if (ffmpegRef.current) {
          await cleanupFiles(ffmpegRef.current, [inputName, outputName]);
        }
      }
    },
    [loadFFmpeg]
  );

  const convertAudio = useCallback(
    async (inputFile: File, format: string, quality?: number): Promise<Blob | null> => {
      let inputName = "";
      let outputName = "";

      try {
        const ffmpeg = await loadFFmpeg();
        const ext = getFileExt(inputFile.name, "mp3");

        inputName = `input_${Date.now()}.${ext}`;
        outputName = `output_${Date.now()}.${format}`;

        setProcessingState({
          status: "processing",
          progress: 0,
          message: "Converting audio...",
        });

        await ffmpeg.writeFile(inputName, await fetchFile(inputFile));

        const args: string[] = ["-i", inputName];
        switch (format) {
          case "mp3":
            args.push("-acodec", "libmp3lame", "-q:a", quality ? String(Math.max(0, 9 - Math.round(quality / 12))) : "2");
            break;
          case "aac":
            args.push("-acodec", "aac", "-b:a", "192k");
            break;
          case "flac":
            args.push("-acodec", "flac");
            break;
          case "wav":
            args.push("-acodec", "pcm_s16le");
            break;
          case "ogg":
            args.push("-acodec", "libvorbis", "-q:a", "6");
            break;
          case "m4a":
            args.push("-acodec", "aac", "-b:a", "192k");
            break;
          default:
            args.push("-acodec", "libmp3lame", "-q:a", "2");
            break;
        }

        args.push("-y", outputName);
        await ffmpeg.exec(args);

        const data = await ffmpeg.readFile(outputName);
        const mimeTypeMap: Record<string, string> = {
          mp3: "audio/mpeg",
          aac: "audio/aac",
          flac: "audio/flac",
          wav: "audio/wav",
          ogg: "audio/ogg",
          m4a: "audio/mp4",
        };
        const blob = fileDataToBlob(data, mimeTypeMap[format] || "audio/mpeg");

        setProcessingState({ status: "complete", progress: 100, message: undefined });
        toast.success("Audio conversion completed");
        return blob;
      } catch (error) {
        setProcessingState({
          status: "error",
          progress: 0,
          error: "Audio conversion failed",
          message: getErrorMessage(error),
        });
        toast.error("Audio conversion failed");
        return null;
      } finally {
        if (ffmpegRef.current) {
          await cleanupFiles(ffmpegRef.current, [inputName, outputName]);
        }
      }
    },
    [loadFFmpeg, setProcessingState]
  );

  return {
    isLoading,
    progress,
    ffmpegLoaded,
    loadFFmpeg,
    convertVideo,
    trimVideo,
    mergeVideos,
    extractAudio,
    convertAudio,
    generateThumbnail,
  };
}
