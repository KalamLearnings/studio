"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormField } from "./FormField";

export interface SpeedOption {
  value: number;
  label: string;
  description?: string;
}

export const DEFAULT_SPEED_OPTIONS: SpeedOption[] = [
  { value: 0.5, label: "Slow", description: "Half speed - easier for beginners" },
  { value: 0.75, label: "Easy", description: "Slightly slower than normal" },
  { value: 1.0, label: "Normal", description: "Default speed" },
  { value: 1.25, label: "Fast", description: "Slightly faster - more challenging" },
  { value: 1.5, label: "Very Fast", description: "Much faster - for advanced learners" },
];

interface GameSpeedSelectorProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  hint?: string;
  options?: SpeedOption[];
  className?: string;
}

/**
 * Reusable game speed selector component.
 * Used by activities like pop_balloons_with_letter, letter_rain, catch_fish_with_letter, etc.
 */
export function GameSpeedSelector({
  value,
  onChange,
  label = "Game Speed",
  hint = "How fast items move (affects difficulty)",
  options = DEFAULT_SPEED_OPTIONS,
  className,
}: GameSpeedSelectorProps) {
  return (
    <div className={className}>
      <FormField label={label} hint={hint}>
      <div className="grid grid-cols-5 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            title={option.description}
            className={cn(
              "px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all flex flex-col items-center",
              value === option.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
            )}
          >
            <span>{option.label}</span>
            <span className="text-xs text-muted-foreground">{option.value}x</span>
          </button>
        ))}
      </div>
    </FormField>
    </div>
  );
}
