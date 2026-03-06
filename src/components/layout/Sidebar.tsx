"use client";
/* eslint-disable @next/next/no-img-element */

import { useEditorStore } from "@/stores/editorStore";
import { Button } from "@/components/ui";
import type { MediaFile } from "@/types";
import {
  Image as ImageIcon,
  VideoCamera,
  Trash,
  CaretLeft,
  CaretRight,
  Plus,
  MusicNote,
} from "@phosphor-icons/react";

export function Sidebar() {
  const {
    sidebarOpen,
    toggleSidebar,
    mediaFiles,
    selectedMediaId,
    selectMedia,
    removeMediaFile,
    clearAllMedia,
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

  return (
    <aside
      className="h-full bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col overflow-hidden transition-all duration-200"
      style={{ width: sidebarOpen ? 280 : 0 }}
    >
      {!sidebarOpen ? (
        <button
          onClick={toggleSidebar}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-30 bg-[var(--color-surface)] p-2 rounded-r-[var(--radius-md)] shadow-[var(--shadow-lg)] border border-l-0 border-[var(--color-border)]"
        >
          <CaretRight size={20} className="text-[var(--color-text-muted)]" />
        </button>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] min-w-[280px]">
            <h2 className="font-semibold text-[var(--color-text)]">
              メディアライブラリ
            </h2>
            <div className="flex items-center gap-1">
              {mediaFiles.length > 0 && (
                <button
                  onClick={clearAllMedia}
                  className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-error)] rounded-[var(--radius-sm)] transition-colors"
                  title="全クリア"
                >
                  <Trash size={20} />
                </button>
              )}
              <button
                onClick={toggleSidebar}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-[var(--radius-sm)] transition-colors"
              >
                <CaretLeft size={20} />
              </button>
            </div>
          </div>

          {/* Media list */}
          <div className="flex-1 overflow-y-auto p-4 min-w-[280px]">
            {mediaFiles.length === 0 ? (
              <div className="text-center py-8">
                <ImageIcon size={48} className="mx-auto text-[var(--color-text-muted)] opacity-40" />
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  メディアがありません
                </p>
                <p className="text-xs text-[var(--color-text-muted)] opacity-70">
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
            <div className="p-4 border-t border-[var(--color-border)] min-w-[280px]">
              <p className="text-xs text-[var(--color-text-muted)] mb-2">
                トラックを追加
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addTrack("video")}
                  className="flex-1"
                >
                  <VideoCamera size={16} className="mr-1" />
                  動画
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addTrack("audio")}
                  className="flex-1"
                >
                  <MusicNote size={16} className="mr-1" />
                  音声
                </Button>
              </div>
            </div>
          )}
        </>
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
        group relative p-2 cursor-pointer transition-colors
        rounded-[var(--radius-md)]
        ${
          isSelected
            ? "bg-[var(--color-accent-soft)] ring-1 ring-[var(--color-accent)]"
            : "hover:bg-[var(--color-accent-soft)]"
        }
      `}
      onClick={onSelect}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-[var(--color-bg)] rounded-[var(--radius-sm)] overflow-hidden mb-2">
        {file.thumbnail ? (
          <img
            src={file.thumbnail}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            {file.type === "video" ? (
              <VideoCamera size={32} className="text-[var(--color-text-muted)]" />
            ) : file.type === "audio" ? (
              <MusicNote size={32} className="text-[var(--color-text-muted)]" />
            ) : (
              <ImageIcon size={32} className="text-[var(--color-text-muted)]" />
            )}
          </div>
        )}

        {/* Duration badge */}
        {file.duration && (
          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs bg-black/70 text-white rounded-[var(--radius-sm)]">
            {formatDuration(file.duration)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--color-text)] truncate">
          {file.name}
        </p>
        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
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
          className="p-1 bg-[var(--color-accent)] text-[var(--color-text-inverse)] rounded-[var(--radius-sm)] hover:bg-[var(--color-accent-hover)] transition-colors"
          title="タイムラインに追加"
        >
          <Plus size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-1 bg-[var(--color-error)] text-white rounded-[var(--radius-sm)] hover:opacity-90 transition-colors"
          title="削除"
        >
          <Trash size={16} />
        </button>
      </div>
    </div>
  );
}
