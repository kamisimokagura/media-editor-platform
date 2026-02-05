"use client";

import { useCallback, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { useEditorStore } from "@/stores/editorStore";
import { toast } from "@/stores/toastStore";
import type { ConversionOptions, FFmpegProgress } from "@/types";

const FFMPEG_CORE_URL =
  "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js";
const FFMPEG_WASM_URL =
  "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm";

// Helper function to convert FFmpeg FileData to Blob
function fileDataToBlob(data: Uint8Array | string, mimeType: string): Blob {
  if (typeof data === "string") {
    return new Blob([data], { type: mimeType });
  }
  // Create a new ArrayBuffer and copy the data to avoid SharedArrayBuffer issues
  const buffer = new ArrayBuffer(data.byteLength);
  const view = new Uint8Array(buffer);
  view.set(data);
  return new Blob([buffer], { type: mimeType });
}

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<FFmpegProgress>({
    progress: 0,
    time: 0,
    speed: 0,
  });

  const { ffmpegLoaded, setFfmpegLoaded, setProcessingState } = useEditorStore();

  const loadFFmpeg = useCallback(async () => {
    if (ffmpegLoaded && ffmpegRef.current) {
      return ffmpegRef.current;
    }

    setIsLoading(true);
    setProcessingState({ status: "loading", progress: 0, message: "FFmpegを読み込み中..." });

    try {
      const ffmpeg = new FFmpeg();

      // Progress handler
      ffmpeg.on("progress", ({ progress, time }) => {
        const progressPercent = Math.round(progress * 100);
        setProgress({ progress: progressPercent, time, speed: 0 });
        setProcessingState({
          status: "processing",
          progress: progressPercent,
          message: `処理中... ${progressPercent}%`,
        });
      });

      // Log handler for debugging
      ffmpeg.on("log", ({ message }) => {
        console.log("[FFmpeg]", message);
      });

      // Load FFmpeg with CORS-compatible URLs
      await ffmpeg.load({
        coreURL: await toBlobURL(FFMPEG_CORE_URL, "text/javascript"),
        wasmURL: await toBlobURL(FFMPEG_WASM_URL, "application/wasm"),
      });

      ffmpegRef.current = ffmpeg;
      setFfmpegLoaded(true);
      setProcessingState({ status: "idle", progress: 0 });
      toast.success("FFmpegの読み込みが完了しました");

      return ffmpeg;
    } catch (error) {
      console.error("FFmpeg load error:", error);
      setProcessingState({
        status: "error",
        progress: 0,
        error: "FFmpegの読み込みに失敗しました",
      });
      toast.error("FFmpegの読み込みに失敗しました。ブラウザがSharedArrayBufferをサポートしているか確認してください。");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [ffmpegLoaded, setFfmpegLoaded, setProcessingState]);

  const convertVideo = useCallback(
    async (
      inputFile: File,
      options: ConversionOptions
    ): Promise<Blob | null> => {
      try {
        const ffmpeg = await loadFFmpeg();
        if (!ffmpeg) return null;

        setProcessingState({
          status: "processing",
          progress: 0,
          message: "動画を変換中...",
        });

        const inputName = `input_${Date.now()}.${inputFile.name.split(".").pop()}`;
        const outputName = `output_${Date.now()}.${options.format}`;

        // Write input file to FFmpeg virtual filesystem
        await ffmpeg.writeFile(inputName, await fetchFile(inputFile));

        // Build FFmpeg command based on options
        const args: string[] = ["-i", inputName];

        // Video codec
        if (options.format === "webm") {
          args.push("-c:v", "libvpx-vp9");
          args.push("-c:a", "libopus");
        } else if (options.format === "mp4") {
          args.push("-c:v", "libx264");
          args.push("-c:a", "aac");
        } else if (options.format === "gif") {
          args.push("-vf", "fps=10,scale=320:-1:flags=lanczos");
        }

        // Quality
        if (options.quality && options.format !== "gif") {
          const crf = Math.round(51 - (options.quality / 100) * 51);
          args.push("-crf", crf.toString());
        }

        // Resolution
        if (options.width && options.height) {
          args.push("-vf", `scale=${options.width}:${options.height}`);
        }

        // FPS
        if (options.fps) {
          args.push("-r", options.fps.toString());
        }

        // Bitrate
        if (options.bitrate) {
          args.push("-b:v", options.bitrate);
        }

        args.push("-y", outputName);

        // Execute FFmpeg command
        await ffmpeg.exec(args);

        // Read output file
        const data = await ffmpeg.readFile(outputName);
        const mimeType =
          options.format === "mp4"
            ? "video/mp4"
            : options.format === "webm"
            ? "video/webm"
            : "image/gif";

        const blob = fileDataToBlob(data, mimeType);

        // Cleanup
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);

        setProcessingState({ status: "complete", progress: 100 });
        toast.success("動画の変換が完了しました");

        return blob;
      } catch (error) {
        console.error("Video conversion error:", error);
        setProcessingState({
          status: "error",
          progress: 0,
          error: "動画の変換に失敗しました",
        });
        toast.error("動画の変換に失敗しました");
        return null;
      }
    },
    [loadFFmpeg, setProcessingState]
  );

  const trimVideo = useCallback(
    async (
      inputFile: File,
      startTime: number,
      endTime: number
    ): Promise<Blob | null> => {
      try {
        const ffmpeg = await loadFFmpeg();
        if (!ffmpeg) return null;

        setProcessingState({
          status: "processing",
          progress: 0,
          message: "動画をトリミング中...",
        });

        const ext = inputFile.name.split(".").pop() || "mp4";
        const inputName = `input_${Date.now()}.${ext}`;
        const outputName = `output_${Date.now()}.${ext}`;

        await ffmpeg.writeFile(inputName, await fetchFile(inputFile));

        const duration = endTime - startTime;
        await ffmpeg.exec([
          "-i",
          inputName,
          "-ss",
          startTime.toString(),
          "-t",
          duration.toString(),
          "-c",
          "copy",
          "-y",
          outputName,
        ]);

        const data = await ffmpeg.readFile(outputName);
        const mimeType = inputFile.type || "video/mp4";
        const blob = fileDataToBlob(data, mimeType);

        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);

        setProcessingState({ status: "complete", progress: 100 });
        toast.success("トリミングが完了しました");

        return blob;
      } catch (error) {
        console.error("Video trim error:", error);
        setProcessingState({
          status: "error",
          progress: 0,
          error: "トリミングに失敗しました",
        });
        toast.error("トリミングに失敗しました");
        return null;
      }
    },
    [loadFFmpeg, setProcessingState]
  );

  const mergeVideos = useCallback(
    async (files: File[]): Promise<Blob | null> => {
      try {
        const ffmpeg = await loadFFmpeg();
        if (!ffmpeg || files.length < 2) return null;

        setProcessingState({
          status: "processing",
          progress: 0,
          message: "動画を結合中...",
        });

        // Write all input files
        const inputNames: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const ext = files[i].name.split(".").pop() || "mp4";
          const inputName = `input_${i}_${Date.now()}.${ext}`;
          await ffmpeg.writeFile(inputName, await fetchFile(files[i]));
          inputNames.push(inputName);
        }

        // Create concat file
        const concatContent = inputNames.map((name) => `file '${name}'`).join("\n");
        await ffmpeg.writeFile("concat.txt", concatContent);

        const outputName = `merged_${Date.now()}.mp4`;

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

        // Cleanup
        for (const name of inputNames) {
          await ffmpeg.deleteFile(name);
        }
        await ffmpeg.deleteFile("concat.txt");
        await ffmpeg.deleteFile(outputName);

        setProcessingState({ status: "complete", progress: 100 });
        toast.success("動画の結合が完了しました");

        return blob;
      } catch (error) {
        console.error("Video merge error:", error);
        setProcessingState({
          status: "error",
          progress: 0,
          error: "結合に失敗しました",
        });
        toast.error("動画の結合に失敗しました");
        return null;
      }
    },
    [loadFFmpeg, setProcessingState]
  );

  const extractAudio = useCallback(
    async (inputFile: File): Promise<Blob | null> => {
      try {
        const ffmpeg = await loadFFmpeg();
        if (!ffmpeg) return null;

        setProcessingState({
          status: "processing",
          progress: 0,
          message: "音声を抽出中...",
        });

        const ext = inputFile.name.split(".").pop() || "mp4";
        const inputName = `input_${Date.now()}.${ext}`;
        const outputName = `audio_${Date.now()}.mp3`;

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
        const blob = fileDataToBlob(data, "audio/mp3");

        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);

        setProcessingState({ status: "complete", progress: 100 });
        toast.success("音声の抽出が完了しました");

        return blob;
      } catch (error) {
        console.error("Audio extraction error:", error);
        setProcessingState({
          status: "error",
          progress: 0,
          error: "音声抽出に失敗しました",
        });
        toast.error("音声の抽出に失敗しました");
        return null;
      }
    },
    [loadFFmpeg, setProcessingState]
  );

  const generateThumbnail = useCallback(
    async (inputFile: File, time: number = 0): Promise<string | null> => {
      try {
        const ffmpeg = await loadFFmpeg();
        if (!ffmpeg) return null;

        const ext = inputFile.name.split(".").pop() || "mp4";
        const inputName = `input_${Date.now()}.${ext}`;
        const outputName = `thumb_${Date.now()}.jpg`;

        await ffmpeg.writeFile(inputName, await fetchFile(inputFile));

        await ffmpeg.exec([
          "-i",
          inputName,
          "-ss",
          time.toString(),
          "-vframes",
          "1",
          "-vf",
          "scale=320:-1",
          "-y",
          outputName,
        ]);

        const data = await ffmpeg.readFile(outputName);
        const blob = fileDataToBlob(data, "image/jpeg");
        const url = URL.createObjectURL(blob);

        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);

        return url;
      } catch (error) {
        console.error("Thumbnail generation error:", error);
        return null;
      }
    },
    [loadFFmpeg]
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
    generateThumbnail,
  };
}
