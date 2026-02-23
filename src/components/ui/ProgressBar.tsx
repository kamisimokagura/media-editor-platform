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
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {message}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      <div className="w-full h-2 bg-gray-200 rounded-full dark:bg-gray-700 overflow-hidden">
        <div
          className="h-full bg-primary-600 rounded-full transition-all duration-300 ease-out"
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
