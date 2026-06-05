"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Extract letters from Arabic word, filtering out diacritics.
 */
export function extractLettersFromWord(word: string): string[] {
  if (!word) return [];
  return word.split("").filter((char) => {
    if (char.trim() === "") return false;
    // Filter out Arabic harakat/diacritics (U+064B – U+065F)
    if (/[ً-ٟ]/.test(char)) return false;
    return true;
  });
}

export interface WordLetterPickerProps {
  word: string;
  value: string;
  onChange: (letter: string) => void;
  onClear?: () => void;
  columns?: 4 | 5 | 6 | 8;
  emptyMessage?: string;
  reverseOrder?: boolean;
}

export function WordLetterPicker({
  word,
  value,
  onChange,
  onClear,
  columns = 6,
  emptyMessage = "Enter a word first to see available letters",
  reverseOrder = true,
}: WordLetterPickerProps) {
  const letters = React.useMemo(() => extractLettersFromWord(word), [word]);

  if (letters.length === 0) {
    return (
      <div className="p-4 bg-muted/50 border border-dashed rounded-lg text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const orderedLetters = reverseOrder ? [...letters].reverse() : letters;

  const gridColsClass = {
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
    8: "grid-cols-8",
  }[columns];

  return (
    <div className="space-y-2">
      <div className={cn("grid gap-2", gridColsClass)}>
        {orderedLetters.map((letter, index) => (
          <button
            key={`${letter}-${index}`}
            type="button"
            onClick={() => onChange(letter)}
            className={cn(
              "aspect-square flex items-center justify-center text-3xl font-arabic rounded-lg border-2 transition-all hover:scale-105",
              value === letter
                ? "border-primary bg-primary/10 shadow-md"
                : "border-border hover:border-primary/50 hover:bg-muted"
            )}
          >
            {letter}
          </button>
        ))}
      </div>

      {onClear && value && (
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-destructive hover:text-destructive/80"
        >
          Clear selection
        </button>
      )}
    </div>
  );
}
