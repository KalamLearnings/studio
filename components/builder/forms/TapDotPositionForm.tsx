"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormField, LetterSelector, PreviewBox } from "./shared";
import { letterFilters } from "@/lib/hooks/useLetters";
import type { BaseActivityFormProps, LetterReference } from "./types";

interface TapDotPositionConfig {
  targetLetter?: LetterReference | null;
  distractorPositions?: string[];
}

const DOT_POSITIONS = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "middle", label: "Middle" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "top-left", label: "Top Left" },
  { value: "top-right", label: "Top Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-right", label: "Bottom Right" },
] as const;

export function TapDotPositionForm({
  config,
  onChange,
  topic,
}: BaseActivityFormProps<TapDotPositionConfig>) {
  const targetLetter = config?.targetLetter || null;
  const distractorPositions = (config?.distractorPositions || []) as string[];

  const updateConfig = (updates: Partial<TapDotPositionConfig>) => {
    onChange({ ...config, ...updates });
  };

  const currentForm = targetLetter?.form || "isolated";

  const togglePosition = (position: string) => {
    const isSelected = distractorPositions.includes(position);
    const updated = isSelected
      ? distractorPositions.filter((p) => p !== position)
      : [...distractorPositions, position];
    updateConfig({ distractorPositions: updated });
  };

  return (
    <div className="space-y-6">
      <FormField
        label="Target Letter"
        hint="Select a letter with dots that students will identify"
        required
      >
        <LetterSelector
          value={targetLetter}
          onChange={(value) =>
            updateConfig({ targetLetter: Array.isArray(value) ? value[0] : value })
          }
          topic={topic}
          showFormSelector
          letterFilter={letterFilters.withDots}
        />
      </FormField>

      <FormField
        label="Distractor Dot Positions"
        hint="Select which positions should show incorrect dots"
      >
        <div className="grid grid-cols-3 gap-2">
          {DOT_POSITIONS.map((pos) => {
            const isSelected = distractorPositions.includes(pos.value);
            return (
              <button
                key={pos.value}
                type="button"
                onClick={() => togglePosition(pos.value)}
                className={cn(
                  "px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                  isSelected
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-border text-foreground hover:border-muted-foreground hover:bg-muted"
                )}
              >
                {pos.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {distractorPositions.length === 0 &&
            "No distractor positions selected - only correct dots will show"}
          {distractorPositions.length === 1 &&
            "1 distractor position selected - easier"}
          {distractorPositions.length === 2 &&
            "2 distractor positions selected - moderate"}
          {distractorPositions.length >= 3 &&
            `${distractorPositions.length} distractor positions selected - challenging`}
        </p>
      </FormField>

      {!targetLetter && (
        <PreviewBox variant="warning" title="Selection Required">
          Please select a target letter to continue
        </PreviewBox>
      )}

      {targetLetter && (
        <PreviewBox variant="preview" title="Activity">
          Students will see the base letter with multiple dots and tap on the
          correct dot position(s) in {currentForm} form.
          {distractorPositions.length > 0 && (
            <>
              {" "}Distractor dots will appear at:{" "}
              <strong>{distractorPositions.join(", ")}</strong>.
            </>
          )}
          {distractorPositions.length === 0 && (
            <> No distractor dots - only the correct position(s) will be shown.</>
          )}
        </PreviewBox>
      )}
    </div>
  );
}
