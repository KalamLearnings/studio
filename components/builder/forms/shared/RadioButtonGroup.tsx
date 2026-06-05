"use client";

/**
 * RadioButtonGroup Component
 *
 * Generic radio button group with labels and optional descriptions.
 * Used for mode selection, variant picking, etc.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface RadioOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface RadioButtonGroupProps<T extends string> {
  label?: string;
  hint?: string;
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  layout?: "horizontal" | "vertical";
  className?: string;
}

export function RadioButtonGroup<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
  layout = "vertical",
  className,
}: RadioButtonGroupProps<T>) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div
        className={cn(
          "gap-2",
          layout === "horizontal" ? "flex flex-wrap" : "flex flex-col"
        )}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all",
              value === option.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <input
              type="radio"
              name={label || "radio-group"}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="mt-0.5 accent-primary"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {option.icon}
                <span className="text-sm font-medium">{option.label}</span>
              </div>
              {option.description && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {option.description}
                </p>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
