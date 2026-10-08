"use client";

import * as React from "react";
import { FormField, WordSelector } from "./shared";
import type { BaseActivityFormProps } from "./types";

interface DriveToShaddaConfig {
  word?: {
    wordId?: string;
    text?: string;
  };
  holdMs?: number;
}

/** The shadda combining mark (U+0651). */
const SHADDA = "ّ";

function countShadda(text: string): number {
  let count = 0;
  for (const ch of text.normalize("NFKC")) {
    if (ch === SHADDA) count++;
  }
  return count;
}

/** The shadda letter, counting base letters only. */
function shaddaLetterPosition(text: string): number {
  let letterIndex = -1;
  for (const ch of text.normalize("NFKC")) {
    if (ch === SHADDA) return letterIndex;
    if (!/[ً-ٰٟـ]/.test(ch)) letterIndex++;
  }
  return -1;
}

export function DriveToShaddaActivityForm({
  config,
  onChange,
}: BaseActivityFormProps<DriveToShaddaConfig>) {
  const wordText = config?.word?.text ?? "";
  const shaddaCount = countShadda(wordText);
  const shaddaPosition = shaddaLetterPosition(wordText);

  const handleWordChange = React.useCallback(
    (word: string, wordData?: { id?: string }) => {
      onChange({
        ...config,
        word: { wordId: wordData?.id, text: word },
        holdMs: config?.holdMs ?? 1000,
      });
    },
    [config, onChange]
  );

  return (
    <div className="space-y-4">
      <FormField
        label="Word"
        required
        hint="The word must be fully vowelled and carry exactly one shadda (ـّ). The car pauses on that letter, the light turns red, then green, and the child drags through."
      >
        <WordSelector
          value={wordText}
          onChange={handleWordChange}
          label=""
          required
          placeholder="Type to search or enter a word with a shadda..."
        />
      </FormField>

      {wordText.length > 0 && (
        <div
          className={
            shaddaCount === 1
              ? "rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300"
          }
        >
          {shaddaCount === 1 ? (
            <>
              Shadda found on letter <strong>#{shaddaPosition + 1}</strong>.
              The car holds there, then drives through.
            </>
          ) : shaddaCount === 0 ? (
            <>
              This word has <strong>no shadda</strong>. Add one (ـّ) or pick a
              different word — without it there is no light to stop at.
            </>
          ) : (
            <>
              This word has <strong>{shaddaCount} shaddas</strong>. Exactly one
              is required, otherwise the hold is ambiguous.
            </>
          )}
        </div>
      )}
    </div>
  );
}
