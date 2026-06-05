"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
  icon?: string;
  description?: string;
}

interface OptionSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  columns?: 2 | 3 | 4 | 5;
}

export function OptionSelector({
  value,
  onChange,
  options,
  columns = 4,
}: OptionSelectorProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
  }[columns];

  return (
    <div className={cn("grid gap-3", gridCols)}>
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
              isSelected
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50 hover:bg-primary/5"
            )}
          >
            {option.icon && <div className="text-3xl">{option.icon}</div>}
            <div className="text-sm font-medium text-center">{option.label}</div>
            {option.description && (
              <div className="text-xs text-muted-foreground text-center">
                {option.description}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
