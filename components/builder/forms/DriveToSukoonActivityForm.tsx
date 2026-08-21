"use client";

import * as React from "react";
import { FormField, Checkbox, WordSelector } from "./shared";
import type { BaseActivityFormProps } from "./types";

interface DriveToSukoonConfig {
  word?: {
    wordId?: string;
    text?: string;
  };
  showStopSign?: boolean;
}

/** The sukoon combining mark (U+0652). */
const SUKOON = "ْ";

function countSukoon(text: string): number {
  let count = 0;
  for (const ch of text.normalize("NFKC")) {
    if (ch === SUKOON) count++;
  }
  return count;
}

/**
 * The index of the sukoon letter, counting base letters only — the same
 * derivation the app performs at render time, shown here so the author can see
 * which letter the car must stop on.
 */
function sukoonLetterPosition(text: string): number {
  let letterIndex = -1;
  for (const ch of text.normalize("NFKC")) {
    if (ch === SUKOON) return letterIndex;
    // A combining mark belongs to the preceding letter, so it doesn't advance.
    if (!/[ً-ٰٟـ]/.test(ch)) letterIndex++;
  }
  return -1;
}

export function DriveToSukoonActivityForm({
  config,
  onChange,
}: BaseActivityFormProps<DriveToSukoonConfig>) {
  const wordText = config?.word?.text ?? "";
  const showStopSign = config?.showStopSign ?? true;

  const sukoonCount = countSukoon(wordText);
  const sukoonPosition = sukoonLetterPosition(wordText);

  const handleWordChange = React.useCallback(
    (word: string, wordData?: { id?: string }) => {
      onChange({
        ...config,
        word: { wordId: wordData?.id, text: word },
      });
    },
    [config, onChange]
  );

  return (
    <div className="space-y-4">
      <FormField
        label="Word"
        required
        hint="The word must be fully vowelled and carry exactly one sukoon (ـْ). The child drives the car to that letter."
      >
        <WordSelector
          value={wordText}
          onChange={handleWordChange}
          label=""
          required
          placeholder="Type to search or enter a word with a sukoon..."
        />
      </FormField>

      {/* The target letter is derived from the word's diacritics, never stored,
          so the author sees exactly what the app will do. */}
      {wordText.length > 0 && (
        <div
          className={
            sukoonCount === 1
              ? "rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300"
          }
        >
          {sukoonCount === 1 ? (
            <>
              Sukoon found on letter{" "}
              <strong>#{sukoonPosition + 1}</strong> — the car must stop there.
            </>
          ) : sukoonCount === 0 ? (
            <>
              This word has <strong>no sukoon</strong>. Add one (ـْ) or pick a
              different word — without it there is nothing to drive to.
            </>
          ) : (
            <>
              This word has <strong>{sukoonCount} sukoons</strong>. Exactly one
              is required, otherwise the target is ambiguous.
            </>
          )}
        </div>
      )}

      <FormField
        label="Stop sign"
        hint="Show a stop sign above the sukoon letter when the child stops there."
      >
        <Checkbox
          checked={showStopSign}
          onChange={(checked) => onChange({ ...config, showStopSign: checked })}
          label="Show the stop sign on a correct stop"
        />
      </FormField>
    </div>
  );
}
