"use client";

import * as React from "react";
import { FormField, LetterSelector, NumberInput } from "./shared";
import type { BaseActivityFormProps, LetterReference } from "./types";

interface ColorLetterConfig {
  letter?: LetterReference | null;
  strokeWidth?: number;
}

export function ColorLetterActivityForm({
  config,
  onChange,
  topic,
}: BaseActivityFormProps<ColorLetterConfig>) {
  const letter = config?.letter || null;
  const strokeWidth = config?.strokeWidth || 10;

  const updateConfig = (updates: Partial<ColorLetterConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-6">
      <FormField
        label="Letter to Color"
        hint="Select the letter and form to color"
        required
      >
        <LetterSelector
          value={letter}
          onChange={(value) =>
            updateConfig({ letter: Array.isArray(value) ? value[0] : value })
          }
          topic={topic}
          showFormSelector
        />
      </FormField>

      <FormField label="Stroke Width" hint="Width of the coloring brush (1-50)">
        <NumberInput
          value={strokeWidth}
          onChange={(value) => updateConfig({ strokeWidth: value })}
          min={1}
          max={50}
          placeholder="10"
        />
      </FormField>
    </div>
  );
}
