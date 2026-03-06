"use client";

interface ProgressBarProps {
  progress: number;
  message?: string;
  showPercentage?: boolean;
  className?: string;
}

export function ProgressBar({
  progress,
  message,
  showPercentage = true,
  className = "",
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={`w-full ${className}`}>
      {(message || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {message && (
            <span className="text-sm text-[var(--color-text-muted)]">
              {message}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm font-medium text-[var(--color-text)]">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      <div className="w-full h-2 bg-[var(--color-border)] rounded-[var(--radius-full)] overflow-hidden">
        <div
          className="h-full bg-[var(--color-accent)] rounded-[var(--radius-full)] transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        >
          {clampedProgress > 0 && clampedProgress < 100 && (
            <div className="w-full h-full loading-shimmer" />
          )}
        </div>
      </div>
    </div>
  );
}
