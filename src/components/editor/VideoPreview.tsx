"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { Button } from "@/components/ui";

export function VideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const {
    mediaFiles,
    selectedMediaId,
    currentTime,
    isPlaying,
    setCurrentTime,
    setIsPlaying,
    project,
  } = useEditorStore();

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
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, [setCurrentTime]);

  // Seek video
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

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
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden">
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
            <svg
              className="w-16 h-16 mx-auto mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
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
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
                />
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlayback}
              className="p-3 bg-primary-600 text-white rounded-full hover:bg-primary-700"
              disabled={!selectedMedia || selectedMedia.type !== "video"}
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
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
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"
                />
              </svg>
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
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
