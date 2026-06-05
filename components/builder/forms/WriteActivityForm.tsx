"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormField, NumberInput } from "./FormField";
import { LetterSelector } from "./shared/LetterSelector";
import type { BaseActivityFormProps, WriteActivityConfig } from "./types";

const WRITING_MODES = [
  {
    value: "guided",
    label: "Guided",
    description: "With guide path and stroke order",
  },
  {
    value: "freehand",
    label: "Freehand",
    description: "No guide, free drawing",
  },
];

/**
 * Form for trace_letter activity.
 * Allows setting the letter to trace, writing mode, and trace count.
 */
export function WriteActivityForm({
  config,
  onChange,
  topic,
}: BaseActivityFormProps<WriteActivityConfig>) {
  const targetLetter = config?.targetLetter || null;
  const mode = config?.mode || "guided";
  const traceCount = config?.traceCount || 1;

  const updateConfig = (updates: Partial<WriteActivityConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      <FormField
        label="Letter"
        hint="The Arabic letter and form to trace"
        required
      >
        <LetterSelector
          value={targetLetter}
          onChange={(value) =>
            updateConfig({
              targetLetter: Array.isArray(value) ? value[0] : value,
            })
          }
          topic={topic}
          showFormSelector={true}
        />
      </FormField>

      <FormField
        label="Writing Mode"
        hint="Choose how students trace the letter"
        required
      >
        <div className="grid grid-cols-2 gap-3">
          {WRITING_MODES.map((modeOption) => (
            <button
              key={modeOption.value}
              type="button"
              onClick={() =>
                updateConfig({
                  mode: modeOption.value as WriteActivityConfig["mode"],
                })
              }
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left",
                mode === modeOption.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-primary/5"
              )}
            >
              {/* Radio indicator */}
              <div
                className={cn(
                  "mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                  mode === modeOption.value
                    ? "border-primary"
                    : "border-muted-foreground/40"
                )}
              >
                {mode === modeOption.value && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </div>

              <div className="flex-1">
                <span className="text-sm font-medium">{modeOption.label}</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {modeOption.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </FormField>

      <FormField
        label="Trace Count"
        hint="Number of times to trace the letter"
      >
        <NumberInput
          value={traceCount}
          onChange={(value) => updateConfig({ traceCount: value })}
          min={1}
          max={10}
        />
      </FormField>
    </div>
  );
}
