"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  showValue?: boolean;
  unit?: string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ label, showValue = true, unit = "", className = "", value, ...props }, ref) => {
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
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {value}
                {unit}
              </span>
            )}
          </div>
        )}
        <input
          ref={ref}
          type="range"
          value={value}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          {...props}
        />
      </div>
    );
  }
);

Slider.displayName = "Slider";
