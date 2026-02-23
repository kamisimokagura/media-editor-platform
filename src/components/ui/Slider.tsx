"use client";

import { InputHTMLAttributes, forwardRef, useState, useRef, useEffect } from "react";

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  showValue?: boolean;
  unit?: string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ label, showValue = true, unit = "", className = "", value, min, max, onChange, ...props }, ref) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(String(value ?? ""));
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [isEditing]);

    const handleValueClick = () => {
      setEditValue(String(value ?? ""));
      setIsEditing(true);
    };

    const commitEdit = () => {
      setIsEditing(false);
      const numValue = parseInt(editValue, 10);
      if (isNaN(numValue)) return;

      const minNum = typeof min === "number" ? min : parseInt(String(min ?? ""), 10) || -Infinity;
      const maxNum = typeof max === "number" ? max : parseInt(String(max ?? ""), 10) || Infinity;
      const clamped = Math.max(minNum, Math.min(maxNum, numValue));

      if (onChange) {
        const syntheticEvent = {
          target: { value: String(clamped) },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        commitEdit();
      } else if (e.key === "Escape") {
        setIsEditing(false);
      }
    };

    return (
      <div className={`w-full ${className}`}>
        {(label || showValue) && (
          <div className="flex justify-between items-center mb-2">
            {label && (
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
              </label>
            )}
            {showValue && (
              isEditing ? (
                <input
                  ref={inputRef}
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleEditKeyDown}
                  min={min}
                  max={max}
                  className="w-16 px-1.5 py-0.5 text-sm text-right bg-white dark:bg-dark-700 border border-primary-500 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              ) : (
                <button
                  onClick={handleValueClick}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-dark-700 px-1.5 py-0.5 rounded-md transition-colors cursor-text tabular-nums"
                  title="クリックして数値を直接入力"
                >
                  {value}
                  {unit}
                </button>
              )
            )}
          </div>
        )}
        <input
          ref={ref}
          type="range"
          value={value}
          min={min}
          max={max}
          onChange={onChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          {...props}
        />
      </div>
    );
  }
);

Slider.displayName = "Slider";
