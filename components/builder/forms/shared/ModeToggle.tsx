"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ModeOption<T extends string = string> {
  value: T;
  label: string;
  icon?: string;
}

interface ModeToggleProps<T extends string = string> {
  label: string;
  value: T;
  options: ModeOption<T>[];
  onChange: (value: T) => void;
  borderBottom?: boolean;
  borderTop?: boolean;
}

export function ModeToggle<T extends string = string>({
  label,
  value,
  options,
  onChange,
  borderBottom = false,
  borderTop = false,
}: ModeToggleProps<T>) {
  return (
    <div
      className={cn(
        borderBottom && "border-b pb-4",
        borderTop && "border-t pt-4"
      )}
    >
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">{label}</label>
        <div className="inline-flex gap-1 bg-muted p-1 rounded-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                value === option.value
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.icon && <span className="mr-1">{option.icon}</span>}
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export const TEXT_IMAGE_MODE_OPTIONS: ModeOption<"text" | "image">[] = [
  { value: "text", label: "Text", icon: "📝" },
  { value: "image", label: "Image", icon: "🖼️" },
];

export const LETTER_WORD_IMAGE_MODE_OPTIONS: ModeOption<
  "letter" | "word" | "image"
>[] = [
  { value: "letter", label: "Letter", icon: "📝" },
  { value: "word", label: "Word", icon: "📝" },
  { value: "image", label: "Image", icon: "🖼️" },
];
