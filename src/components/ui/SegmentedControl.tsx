"use client";

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`inline-flex p-1 rounded-[var(--radius-md)] bg-[var(--color-border)] ${className}`}
      role="tablist"
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={`
            px-4 py-1.5 text-sm font-medium rounded-[var(--radius-sm)]
            transition-all duration-200
            ${
              value === option.value
                ? "bg-[var(--color-surface)] text-[var(--color-accent-text)] shadow-[var(--shadow-sm)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
