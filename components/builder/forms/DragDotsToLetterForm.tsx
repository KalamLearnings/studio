"use client";

import * as React from "react";
import { FormField, LetterSelector, SliderWithValue, PreviewBox } from "./shared";
import { letterFilters } from "@/lib/hooks/useLetters";
import type { BaseActivityFormProps, LetterReference } from "./types";

interface DragDotsToLetterConfig {
  targetLetter?: LetterReference | null;
  distractorDotsCount?: number;
}

export function DragDotsToLetterForm({
  config,
  onChange,
  topic,
}: BaseActivityFormProps<DragDotsToLetterConfig>) {
  const targetLetter = config?.targetLetter || null;
  const distractorDotsCount = config?.distractorDotsCount ?? 0;

  const updateConfig = (updates: Partial<DragDotsToLetterConfig>) => {
    onChange({ ...config, ...updates });
  };

  const currentForm = targetLetter?.form || "isolated";

  return (
    <div className="space-y-6">
      <FormField
        label="Target Letter"
        hint="Select a letter with dots that students will complete"
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

      <SliderWithValue
        label="Distractor Dots"
        value={distractorDotsCount}
        onChange={(value) => updateConfig({ distractorDotsCount: value })}
        min={0}
        max={5}
        hint={
          distractorDotsCount === 0
            ? "No distractor dots - only correct dots shown"
            : distractorDotsCount === 1
            ? "1 extra incorrect dot - slightly harder"
            : `${distractorDotsCount} extra incorrect dots - more challenging`
        }
      />

      {!targetLetter && (
        <PreviewBox variant="warning" title="Selection Required">
          Please select a target letter to continue
        </PreviewBox>
      )}

      {targetLetter && (
        <PreviewBox variant="preview" title="Preview">
          Students will drag dots to complete the letter in {currentForm} form.
          {distractorDotsCount > 0 && (
            <>
              {" "}The activity includes <strong>{distractorDotsCount}</strong> distractor dot
              {distractorDotsCount > 1 ? "s" : ""} (gray) that should not be placed.
            </>
          )}
        </PreviewBox>
      )}
    </div>
  );
}
