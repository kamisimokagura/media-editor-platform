"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useEditorStore } from "@/stores/editorStore";
import type { Track, Clip } from "@/types";

export function Timeline() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragInfo, setDragInfo] = useState<{
    clipId: string;
    trackId: string;
    startX: number;
    originalStartTime: number;
  } | null>(null);

  const {
    project,
    currentTime,
    zoom,
    setCurrentTime,
    selectedClipId,
    selectClip,
    selectedTrackId,
    selectTrack,
    updateClip,
    removeClip,
    removeTrack,
    setZoom,
  } = useEditorStore();

  const pixelsPerSecond = 50 * zoom;

  // Handle timeline click for seeking
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current || isDragging) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = x / pixelsPerSecond;
      setCurrentTime(Math.max(0, time));
    },
    [pixelsPerSecond, setCurrentTime, isDragging]
  );

  // Handle clip drag start
  const handleClipDragStart = useCallback(
    (e: React.MouseEvent, trackId: string, clip: Clip) => {
      e.stopPropagation();
      setIsDragging(true);
      setDragInfo({
        clipId: clip.id,
        trackId,
        startX: e.clientX,
        originalStartTime: clip.startTime,
      });
      selectClip(clip.id);
    },
    [selectClip]
  );

  // Handle clip drag
  useEffect(() => {
    if (!isDragging || !dragInfo) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragInfo.startX;
      const deltaTime = deltaX / pixelsPerSecond;
      const newStartTime = Math.max(0, dragInfo.originalStartTime + deltaTime);

      updateClip(dragInfo.trackId, dragInfo.clipId, { startTime: newStartTime });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragInfo(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragInfo, pixelsPerSecond, updateClip]);

  // Handle zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(zoom + delta);
      }
    },
    [zoom, setZoom]
  );

  // Format time for ruler
  const formatRulerTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Generate ruler marks
  const generateRulerMarks = () => {
    const duration = project?.timeline.duration || 60;
    const marks: { time: number; major: boolean }[] = [];

    // Determine interval based on zoom
    const interval = zoom < 0.5 ? 10 : zoom < 1 ? 5 : zoom < 2 ? 2 : 1;

    for (let t = 0; t <= duration + 10; t += interval) {
      marks.push({ time: t, major: t % (interval * 5) === 0 });
    }

    return marks;
  };

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        <p>プロジェクトを作成してください</p>
      </div>
    );
  }

  const rulerMarks = generateRulerMarks();
  const timelineWidth = Math.max(
    ((project.timeline.duration || 60) + 10) * pixelsPerSecond,
    800
  );

  return (
    <div
      className="h-full flex flex-col bg-dark-900 rounded-lg overflow-hidden"
      onWheel={handleWheel}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-dark-800 border-b border-dark-700">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            {project.timeline.tracks.length} トラック
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(zoom - 0.2)}
            className="p-1 text-gray-400 hover:text-white"
            title="ズームアウト"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
              />
            </svg>
          </button>
          <span className="text-xs text-gray-500 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(zoom + 0.2)}
            className="p-1 text-gray-400 hover:text-white"
            title="ズームイン"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Timeline content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track labels */}
        <div className="w-48 flex-shrink-0 bg-dark-800 border-r border-dark-700">
          {/* Ruler header */}
          <div className="h-8 border-b border-dark-700" />

          {/* Track labels */}
          {project.timeline.tracks.map((track) => (
            <div
              key={track.id}
              className={`
                h-16 flex items-center justify-between px-3 border-b border-dark-700 cursor-pointer
                ${selectedTrackId === track.id ? "bg-primary-900/20" : "hover:bg-dark-700"}
              `}
              onClick={() => selectTrack(track.id)}
            >
              <div className="flex items-center gap-2">
                {track.type === "video" ? (
                  <svg
                    className="w-4 h-4 text-blue-400"
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
                ) : (
                  <svg
                    className="w-4 h-4 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                )}
                <span className="text-sm text-gray-300 truncate">{track.name}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeTrack(track.id);
                }}
                className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Timeline area */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden" ref={timelineRef}>
          <div style={{ width: timelineWidth, minWidth: "100%" }}>
            {/* Ruler */}
            <div className="h-8 bg-dark-800 border-b border-dark-700 relative">
              {rulerMarks.map(({ time, major }) => (
                <div
                  key={time}
                  className="absolute top-0 bottom-0 flex flex-col items-center"
                  style={{ left: time * pixelsPerSecond }}
                >
                  <div
                    className={`w-px ${
                      major ? "h-full bg-gray-600" : "h-2 bg-gray-700"
                    }`}
                  />
                  {major && (
                    <span className="text-xs text-gray-500 mt-1">
                      {formatRulerTime(time)}
                    </span>
                  )}
                </div>
              ))}

              {/* Playhead indicator in ruler */}
              <div
                className="absolute top-0 w-4 h-4 bg-red-500 transform -translate-x-1/2"
                style={{
                  left: currentTime * pixelsPerSecond,
                  clipPath: "polygon(50% 100%, 0% 0%, 100% 0%)",
                }}
              />
            </div>

            {/* Tracks */}
            <div className="relative" onClick={handleTimelineClick}>
              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none"
                style={{ left: currentTime * pixelsPerSecond }}
              />

              {project.timeline.tracks.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  pixelsPerSecond={pixelsPerSecond}
                  selectedClipId={selectedClipId}
                  onClipDragStart={handleClipDragStart}
                  onClipSelect={selectClip}
                  onClipRemove={(clipId) => removeClip(track.id, clipId)}
                />
              ))}

              {project.timeline.tracks.length === 0 && (
                <div className="h-32 flex items-center justify-center text-gray-500">
                  トラックを追加してメディアを配置してください
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TrackRowProps {
  track: Track;
  pixelsPerSecond: number;
  selectedClipId: string | null;
  onClipDragStart: (e: React.MouseEvent, trackId: string, clip: Clip) => void;
  onClipSelect: (clipId: string | null) => void;
  onClipRemove: (clipId: string) => void;
}

function TrackRow({
  track,
  pixelsPerSecond,
  selectedClipId,
  onClipDragStart,
  onClipSelect,
  onClipRemove,
}: TrackRowProps) {
  const trackColor = track.type === "video" ? "bg-blue-600" : "bg-green-600";

  return (
    <div className="h-16 relative bg-dark-900 border-b border-dark-700">
      {track.clips.map((clip) => (
        <div
          key={clip.id}
          className={`
            absolute top-1 bottom-1 rounded cursor-move
            ${trackColor}
            ${
              selectedClipId === clip.id
                ? "ring-2 ring-white ring-opacity-50"
                : "hover:brightness-110"
            }
          `}
          style={{
            left: clip.startTime * pixelsPerSecond,
            width: Math.max(clip.duration * pixelsPerSecond, 20),
          }}
          onMouseDown={(e) => onClipDragStart(e, track.id, clip)}
          onClick={(e) => {
            e.stopPropagation();
            onClipSelect(clip.id);
          }}
        >
          <div className="h-full px-2 flex items-center overflow-hidden">
            <span className="text-xs text-white truncate">{clip.name}</span>
          </div>

          {/* Resize handles */}
          <div className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-white/30" />
          <div className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-white/30" />

          {/* Delete button */}
          {selectedClipId === clip.id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClipRemove(clip.id);
              }}
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-700"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
