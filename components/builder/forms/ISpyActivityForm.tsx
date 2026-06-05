"use client";

import * as React from "react";
import { FormField, LetterSelector, NumberInput, Select } from "./shared";
import type { BaseActivityFormProps, LetterReference } from "./types";

interface ISpyConfig {
  targetLetter?: LetterReference | LetterReference[] | null;
  distractorLetters?: LetterReference[];
  targetCount?: number;
  totalLetters?: number;
  letterSize?: string;
}

const DEFAULT_TARGET_COUNT = 5;
const DEFAULT_TOTAL_LETTERS = 12;

const LETTER_SIZE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

export function ISpyActivityForm({
  config,
  onChange,
  topic,
}: BaseActivityFormProps<ISpyConfig>) {
  const targetLetter = config?.targetLetter || null;
  const distractorLetters = config?.distractorLetters || [];
  const targetCount = config?.targetCount ?? DEFAULT_TARGET_COUNT;
  const totalLetters = config?.totalLetters ?? DEFAULT_TOTAL_LETTERS;
  const letterSize = config?.letterSize || "medium";

  const updateConfig = (updates: Partial<ISpyConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-6">
      <FormField
        label="Target Letter"
        hint="The letter the child needs to find"
        required
      >
        <LetterSelector
          value={targetLetter}
          onChange={(value) => updateConfig({ targetLetter: value })}
          topic={topic}
          showFormSelector
          multiFormSelect
        />
      </FormField>

      <FormField
        label="Distractor Letters"
        hint="Wrong letters to include. Leave empty to use random letters."
      >
        <LetterSelector
          value={distractorLetters}
          onChange={(value) =>
            updateConfig({
              distractorLetters: Array.isArray(value) ? value : value ? [value] : [],
            })
          }
          multiSelect
          multiFormSelect
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Target Count" hint="How many target letters to find">
          <NumberInput
            value={targetCount}
            onChange={(value) => updateConfig({ targetCount: value })}
            min={1}
            max={15}
          />
        </FormField>

        <FormField label="Total Letters" hint="Total letters on screen">
          <NumberInput
            value={totalLetters}
            onChange={(value) => updateConfig({ totalLetters: value })}
            min={3}
            max={20}
          />
        </FormField>
      </div>

      <FormField label="Letter Size" hint="Size of letters displayed on screen">
        <Select
          value={letterSize}
          onChange={(value) => updateConfig({ letterSize: value })}
          options={LETTER_SIZE_OPTIONS}
        />
      </FormField>

      {targetCount > totalLetters && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Warning: Target count cannot exceed total letters on screen.
          </p>
        </div>
      )}
    </div>
  );
}
