"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface Option {
  value: string;
  label: string;
  icon?: string;
  description?: string;
}

interface OptionsGridProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  columns?: 2 | 3 | 4 | 5;
  size?: "sm" | "md" | "lg";
}

/**
 * Grid of selectable options with icons and optional descriptions.
 * Used for break types, shapes, line patterns, etc.
 */
export function OptionsGrid({
  value,
  onChange,
  options,
  columns = 4,
  size = "md",
}: OptionsGridProps) {
  const gridColsClass = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
  }[columns];

  const sizeClasses = {
    sm: "p-2 gap-1",
    md: "p-3 gap-2",
    lg: "p-4 gap-3",
  }[size];

  const iconSize = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  }[size];

  return (
    <div className={cn("grid gap-2", gridColsClass)}>
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border-2 transition-all",
              sizeClasses,
              isSelected
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
            )}
          >
            {option.icon && (
              <span className={cn(iconSize, "mb-1")}>{option.icon}</span>
            )}
            <span className="text-xs font-medium text-center">
              {option.label}
            </span>
            {option.description && (
              <span className="text-[10px] text-muted-foreground text-center mt-0.5">
                {option.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface NumberGridProps {
  value: number;
  onChange: (value: number) => void;
  options: number[];
  columns?: 2 | 3 | 4 | 5;
}

/**
 * Grid of selectable number options.
 * Used for card counts, target counts, etc.
 */
export function NumberGrid({
  value,
  onChange,
  options,
  columns = 4,
}: NumberGridProps) {
  const gridColsClass = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
  }[columns];

  return (
    <div className={cn("grid gap-2", gridColsClass)}>
      {options.map((num) => {
        const isSelected = value === num;

        return (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            className={cn(
              "px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all",
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
            )}
          >
            {num}
          </button>
        );
      })}
    </div>
  );
}
