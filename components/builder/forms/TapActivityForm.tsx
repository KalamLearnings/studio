"use client";

import * as React from "react";
import { useMemo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { FormField, NumberInput, WordSelector } from "./shared";
import type { BaseActivityFormProps, TapActivityConfig } from "./types";

interface LetterInstance {
  letter: string;
  index: number;
  position: number; // 1-based position in the word (for display)
}

/**
 * Extract all letters from an Arabic word with their positions.
 * Filters out diacritics and special characters.
 * Returns each letter instance separately (including duplicates).
 * Returns in RTL order (rightmost letter first) with position #1 being the first letter read.
 */
function extractAllLettersFromWord(word: string): LetterInstance[] {
  if (!word) return [];

  // Arabic diacritics range
  const diacriticsRegex = /[ً-ٰٟ]/g;

  // Remove diacritics
  const cleanWord = word.replace(diacriticsRegex, "");

  // Collect all Arabic letters
  const letters: { letter: string; index: number }[] = [];
  for (let i = 0; i < cleanWord.length; i++) {
    const char = cleanWord[i];
    const code = char.charCodeAt(0);

    // Filter for Arabic letters (basic Arabic block)
    if (code >= 0x0621 && code <= 0x064a) {
      letters.push({ letter: char, index: i });
    }
  }

  // Reverse to get RTL order (rightmost letter first)
  // Position 1 = first letter read in Arabic (rightmost)
  const reversed = letters.slice().reverse();
  return reversed.map((l, idx) => ({
    letter: l.letter,
    index: l.index,
    position: idx + 1,
  }));
}

interface WordLetterPickerProps {
  word: string;
  /** Selected indices (0-based positions in the cleaned word) */
  selectedIndices: number[];
  onChange: (indices: number[]) => void;
  emptyMessage?: string;
}

/**
 * Letter picker that shows ALL letters from a word (including duplicates).
 * Allows multi-select by index.
 */
function WordLetterPicker({
  word,
  selectedIndices,
  onChange,
  emptyMessage = "Enter a word first",
}: WordLetterPickerProps) {
  const letterInstances = useMemo(() => extractAllLettersFromWord(word), [word]);

  if (letterInstances.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-dashed text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  const handleToggle = (index: number) => {
    if (selectedIndices.includes(index)) {
      // Deselect
      onChange(selectedIndices.filter((i) => i !== index));
    } else {
      // Select
      onChange([...selectedIndices, index]);
    }
  };

  const handleSelectAll = () => {
    onChange(letterInstances.map((l) => l.index));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSelectAll}
          className="text-xs px-2 py-1 rounded border border-primary/50 text-primary hover:bg-primary/10 transition-colors"
        >
          Select All
        </button>
        <button
          type="button"
          onClick={handleClearAll}
          className="text-xs px-2 py-1 rounded border border-muted-foreground/50 text-muted-foreground hover:bg-muted transition-colors"
        >
          Clear All
        </button>
        <span className="text-xs text-muted-foreground self-center ml-auto">
          {selectedIndices.length} of {letterInstances.length} selected
        </span>
      </div>

      {/* Letter grid - already in RTL order from extraction */}
      <div className="flex flex-wrap gap-2">
        {letterInstances.map((instance) => {
          const isSelected = selectedIndices.includes(instance.index);

          return (
            <button
              key={instance.index}
              type="button"
              onClick={() => handleToggle(instance.index)}
              className={cn(
                "min-w-14 px-2 py-2 rounded-lg border-2 transition-all",
                "flex flex-col items-center justify-center",
                isSelected
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
              )}
            >
              <span className="text-2xl font-arabic leading-none">
                {instance.letter}
              </span>
              <span className="text-[10px] text-muted-foreground mt-1">
                #{instance.position}
              </span>
            </button>
          );
        })}
      </div>

      {/* Visual representation of word with highlights */}
      {selectedIndices.length > 0 && (
        <div className="p-3 rounded-lg bg-muted/50 border">
          <p className="text-xs text-muted-foreground mb-2">Preview (selected letters highlighted):</p>
          <div className="text-3xl font-arabic text-right" dir="rtl">
            {letterInstances.map((instance) => {
              const isSelected = selectedIndices.includes(instance.index);
              return (
                <span
                  key={instance.index}
                  className={cn(
                    "inline-block",
                    isSelected && "bg-primary/20 text-primary rounded px-0.5"
                  )}
                >
                  {instance.letter}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Form for tap_letter_in_word activity.
 * Allows setting target word, selecting specific letter instances to find, and target count.
 */
export function TapActivityForm({
  config,
  onChange,
}: BaseActivityFormProps<TapActivityConfig>) {
  const targetWord = (config?.targetWord as string) || "";
  const wordMeaning = (config?.wordMeaning as string) || "";

  // Support both old format (targetLetter as string) and new format (targetIndices as array)
  const targetIndices = useMemo(() => {
    // If we have targetIndices, use it
    if (Array.isArray(config?.targetIndices)) {
      return config.targetIndices as number[];
    }
    // Legacy: convert targetLetter string to indices
    if (config?.targetLetter && typeof config.targetLetter === "string") {
      const letterInstances = extractAllLettersFromWord(targetWord);
      return letterInstances
        .filter((l) => l.letter === config.targetLetter)
        .map((l) => l.index);
    }
    return [];
  }, [config?.targetIndices, config?.targetLetter, targetWord]);

  const targetCount = (config?.targetCount as number) || targetIndices.length || 1;

  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const prevWord = React.useRef(targetWord);

  const updateConfig = React.useCallback(
    (updates: Partial<TapActivityConfig>) => {
      onChange({ ...config, ...updates });
    },
    [config, onChange]
  );

  // Get letter instances for display
  const letterInstances = useMemo(
    () => extractAllLettersFromWord(targetWord),
    [targetWord]
  );

  // Get selected letters for display
  const selectedLetters = useMemo(() => {
    return letterInstances.filter((l) => targetIndices.includes(l.index));
  }, [letterInstances, targetIndices]);

  // Handle index selection change - auto-update targetCount
  const handleIndicesChange = (indices: number[]) => {
    // Get unique letters from selected indices
    const letters = letterInstances
      .filter((l) => indices.includes(l.index))
      .map((l) => l.letter);
    const uniqueLetters = Array.from(new Set(letters));

    updateConfig({
      targetIndices: indices,
      targetLetter: uniqueLetters.length === 1 ? uniqueLetters[0] : uniqueLetters.join(""),
      targetCount: indices.length,
    });
  };

  // Clear selection if word changes
  useEffect(() => {
    if (!initialLoadComplete && targetWord) {
      setInitialLoadComplete(true);
      prevWord.current = targetWord;
      return;
    }

    if (prevWord.current !== targetWord) {
      prevWord.current = targetWord;
      // Clear selection on word change
      updateConfig({
        targetIndices: [],
        targetLetter: "",
        targetCount: 1,
      });
    }
  }, [targetWord, initialLoadComplete, updateConfig]);

  return (
    <div className="space-y-4">
      <FormField
        label="Target Word"
        hint="The Arabic word containing the letter(s) to find"
        required
      >
        <WordSelector
          value={targetWord}
          onChange={(word, wordData) => {
            updateConfig({
              targetWord: word,
              wordMeaning: wordData?.english || wordMeaning,
              targetIndices: [],
              targetLetter: "",
              targetCount: 1,
            });
          }}
          showTranslation
          translationValue={wordMeaning}
          onTranslationChange={(value) => updateConfig({ wordMeaning: value })}
          placeholder="Type to search word library..."
        />
      </FormField>

      <FormField
        label="Target Letter(s)"
        hint="Select which letter instance(s) the student should find"
        required
      >
        <WordLetterPicker
          word={targetWord}
          selectedIndices={targetIndices}
          onChange={handleIndicesChange}
          emptyMessage="Enter a target word first to see available letters"
        />
      </FormField>

      <FormField
        label="Target Count"
        hint="Number of letters to find (auto-calculated from selection)"
        required
      >
        <NumberInput
          value={targetCount}
          onChange={(value) => updateConfig({ targetCount: value })}
          min={1}
        />
        {selectedLetters.length > 0 && (
          <p className="text-xs text-primary mt-1">
            {selectedLetters.length} letter{selectedLetters.length > 1 ? "s" : ""} selected
            {selectedLetters.length > 1 && (
              <span className="text-muted-foreground">
                {" "}({Array.from(new Set(selectedLetters.map((l) => l.letter))).join(", ")})
              </span>
            )}
          </p>
        )}
      </FormField>
    </div>
  );
}
