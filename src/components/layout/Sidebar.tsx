"use client";

import { useEditorStore } from "@/stores/editorStore";
import { Button } from "@/components/ui";
import type { MediaFile } from "@/types";

export function Sidebar() {
  const {
    sidebarOpen,
    toggleSidebar,
    mediaFiles,
    selectedMediaId,
    selectMedia,
    removeMediaFile,
    addTrack,
    addClipToTrack,
    project,
  } = useEditorStore();

  const handleAddToTimeline = (mediaId: string) => {
    if (!project || project.timeline.tracks.length === 0) {
      // Create a new track first
      const media = mediaFiles.find((f) => f.id === mediaId);
      if (media) {
        addTrack(media.type === "audio" ? "audio" : "video");
        // Add clip to the new track
        setTimeout(() => {
          const { project: updatedProject } = useEditorStore.getState();
          if (updatedProject && updatedProject.timeline.tracks.length > 0) {
            const track = updatedProject.timeline.tracks[updatedProject.timeline.tracks.length - 1];
            addClipToTrack(track.id, mediaId, 0);
          }
        }, 0);
      }
    } else {
      // Add to last track
      const lastTrack = project.timeline.tracks[project.timeline.tracks.length - 1];
      addClipToTrack(lastTrack.id, mediaId, project.timeline.duration);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!sidebarOpen) {
    return (
      <button
        onClick={toggleSidebar}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-30 bg-white dark:bg-dark-800 p-2 rounded-r-lg shadow-lg border border-l-0 border-gray-200 dark:border-dark-700"
      >
        <svg
          className="w-5 h-5 text-gray-600 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    );
  }

  return (
    <aside className="w-64 h-full bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-dark-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-700">
        <h2 className="font-semibold text-gray-900 dark:text-white">
          メディアライブラリ
        </h2>
        <button
          onClick={toggleSidebar}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* Media list */}
      <div className="flex-1 overflow-y-auto p-4">
        {mediaFiles.length === 0 ? (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              メディアがありません
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              ファイルをドロップして追加
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {mediaFiles.map((file) => (
              <MediaItem
                key={file.id}
                file={file}
                isSelected={file.id === selectedMediaId}
                onSelect={() => selectMedia(file.id)}
                onRemove={() => removeMediaFile(file.id)}
                onAddToTimeline={() => handleAddToTimeline(file.id)}
                formatSize={formatFileSize}
                formatDuration={formatDuration}
              />
            ))}
          </div>
        )}
      </div>

      {/* Track controls */}
      {project && (
        <div className="p-4 border-t border-gray-200 dark:border-dark-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            トラックを追加
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addTrack("video")}
              className="flex-1"
            >
              <svg
                className="w-4 h-4 mr-1"
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
              動画
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addTrack("audio")}
              className="flex-1"
            >
              <svg
                className="w-4 h-4 mr-1"
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
              音声
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}

interface MediaItemProps {
  file: MediaFile;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onAddToTimeline: () => void;
  formatSize: (bytes: number) => string;
  formatDuration: (seconds: number) => string;
}

function MediaItem({
  file,
  isSelected,
  onSelect,
  onRemove,
  onAddToTimeline,
  formatSize,
  formatDuration,
}: MediaItemProps) {
  return (
    <div
      className={`
        group relative p-2 rounded-lg cursor-pointer transition-colors
        ${
          isSelected
            ? "bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-500"
            : "hover:bg-gray-50 dark:hover:bg-dark-700"
        }
      `}
      onClick={onSelect}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-100 dark:bg-dark-700 rounded overflow-hidden mb-2">
        {file.thumbnail ? (
          <img
            src={file.thumbnail}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            {file.type === "video" ? (
              <svg
                className="w-8 h-8 text-gray-400"
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
            ) : file.type === "audio" ? (
              <svg
                className="w-8 h-8 text-gray-400"
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
            ) : (
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            )}
          </div>
        )}

        {/* Duration badge */}
        {file.duration && (
          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs bg-black/70 text-white rounded">
            {formatDuration(file.duration)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {file.name}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{formatSize(file.size)}</span>
          {file.width && file.height && (
            <span>
              {file.width}x{file.height}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToTimeline();
          }}
          className="p-1 bg-primary-600 text-white rounded hover:bg-primary-700"
          title="タイムラインに追加"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
          title="削除"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
