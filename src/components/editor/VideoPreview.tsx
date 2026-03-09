"use client";
/* eslint-disable @next/next/no-img-element */

import { useRef, useEffect, useState, useCallback } from "react";
import { useEditorStore } from "@/stores/editorStore";
import {
  Play,
  Pause,
  Rewind,
  FastForward,
  SpeakerHigh,
  SpeakerX,
  VideoCamera,
} from "@phosphor-icons/react";

export function VideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeUpdateFrameRef = useRef<number | null>(null);
  const pendingTimeRef = useRef<number | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const mediaFiles = useEditorStore((state) => state.mediaFiles);
  const selectedMediaId = useEditorStore((state) => state.selectedMediaId);
  const currentTime = useEditorStore((state) => state.currentTime);
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime);
  const setIsPlaying = useEditorStore((state) => state.setIsPlaying);
  const project = useEditorStore((state) => state.project);

  const selectedMedia = mediaFiles.find((f) => f.id === selectedMediaId);

  // Sync playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // Update current time from video
  const flushTimeUpdate = useCallback(() => {
    timeUpdateFrameRef.current = null;
    if (pendingTimeRef.current === null) return;
    setCurrentTime(pendingTimeRef.current);
    pendingTimeRef.current = null;
  }, [setCurrentTime]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      pendingTimeRef.current = videoRef.current.currentTime;
      if (timeUpdateFrameRef.current !== null) return;
      timeUpdateFrameRef.current = window.requestAnimationFrame(flushTimeUpdate);
    }
  }, [flushTimeUpdate]);

  // Seek video
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  useEffect(() => {
    return () => {
      if (timeUpdateFrameRef.current !== null) {
        window.cancelAnimationFrame(timeUpdateFrameRef.current);
      }
    };
  }, []);

  // Handle play/pause toggle
  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (videoRef.current) {
      videoRef.current.muted = newMuted;
    }
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-[var(--radius-lg)] overflow-hidden">
      {/* Video Container */}
      <div className="relative flex-1 flex items-center justify-center bg-black">
        {selectedMedia && selectedMedia.type === "video" ? (
          <video
            ref={videoRef}
            src={selectedMedia.url}
            className="max-w-full max-h-full"
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                videoRef.current.volume = volume;
              }
            }}
          />
        ) : selectedMedia && selectedMedia.type === "image" ? (
          <img
            src={selectedMedia.url}
            alt={selectedMedia.name}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="text-center text-gray-500">
            <VideoCamera size={64} weight="thin" className="mx-auto mb-4 opacity-50" />
            <p>メディアを選択してください</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 px-4 py-3">
        {/* Progress bar */}
        <div className="mb-3">
          <input
            type="range"
            min={0}
            max={selectedMedia?.duration || project?.timeline.duration || 100}
            step={0.01}
            value={currentTime}
            onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between">
          {/* Left controls */}
          <div className="flex items-center gap-2">
            {/* Skip back */}
            <button
              onClick={() => setCurrentTime(Math.max(0, currentTime - 10))}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
              title="10秒戻る"
            >
              <Rewind size={20} weight="bold" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlayback}
              className="p-3 bg-[var(--color-accent)] text-white rounded-full hover:bg-[var(--color-accent-hover)]"
              disabled={!selectedMedia || selectedMedia.type !== "video"}
            >
              {isPlaying ? (
                <Pause size={20} weight="fill" />
              ) : (
                <Play size={20} weight="fill" />
              )}
            </button>

            {/* Skip forward */}
            <button
              onClick={() =>
                setCurrentTime(
                  Math.min(
                    selectedMedia?.duration || project?.timeline.duration || 0,
                    currentTime + 10
                  )
                )
              }
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
              title="10秒進む"
            >
              <FastForward size={20} weight="bold" />
            </button>

            {/* Time display */}
            <span className="text-sm text-gray-400 ml-4">
              {formatTime(currentTime)} /{" "}
              {formatTime(selectedMedia?.duration || project?.timeline.duration || 0)}
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            {/* Volume */}
            <button
              onClick={toggleMute}
              className="p-2 text-gray-400 hover:text-white"
            >
              {isMuted || volume === 0 ? (
                <SpeakerX size={20} weight="bold" />
              ) : (
                <SpeakerHigh size={20} weight="bold" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
