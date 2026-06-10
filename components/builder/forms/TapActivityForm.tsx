"use client";

import * as React from "react";
import { useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { FormField, WordSelector } from "./shared";
import { useLetters } from "@/lib/hooks/useLetters";
import { stripTatweel } from "@/lib/utils/letterReference";
import {
  HARAKA_CHARS,
  isLetterReference,
  createLetterReference,
  type BaseActivityFormProps,
  type TapActivityConfig,
  type HarakaType,
  type LetterReference,
  type LetterForm,
} from "./types";

/**
 * Extract letters from an Arabic word, keeping harakat attached to their letters.
 *
 * For example, "بَبِبُبْ" returns ["بَ", "بِ", "بُ", "بْ"] - each letter with its diacritic.
 *
 * Strips:
 * - Whitespace
 *
 * Preserves duplicates so the picker can surface every occurrence.
 */
export function extractLettersFromWord(word: string): string[] {
  if (!word) return [];

  const result: string[] = [];
  const chars = word.split("");

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];

    // Skip whitespace
    if (char.trim() === "") continue;

    // Skip standalone diacritics (they should be attached to previous letter)
    if (/[ً-ٟ]/.test(char)) continue;

    // Start with the base letter
    let letterWithDiacritics = char;

    // Collect any following diacritics
    while (i + 1 < chars.length && /[ً-ٟ]/.test(chars[i + 1])) {
      i++;
      letterWithDiacritics += chars[i];
    }

    result.push(letterWithDiacritics);
  }

  return result;
}

// Extract haraka from a character with diacritic
function extractHaraka(char: string): HarakaType | undefined {
  for (const [harakaType, harakaChar] of Object.entries(HARAKA_CHARS)) {
    if (harakaChar && char.includes(harakaChar)) {
      return harakaType as HarakaType;
    }
  }
  return undefined;
}

// Strip diacritics to get base letter
function stripDiacritics(char: string): string {
  return char.replace(/[ً-ٰٟ]/g, "");
}

// For tap_letter_in_word, always use 'isolated' form since we're matching
// against the base letter character as it appears in the word string
function determineLetterForm(): LetterForm {
  return "isolated";
}

interface WordLetterPickerProps {
  word: string;
  /** Selected logical letter indices (0-based, reading order). */
  selectedIndices: number[];
  onToggleIndex: (index: number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  emptyMessage?: string;
}

/**
 * Letter picker that shows ALL logical letters from a word (including duplicates),
 * each with its haraka attached. Multi-select by index — selecting a position pins
 * that exact occurrence.
 */
function WordLetterPicker({
  word,
  selectedIndices,
  onToggleIndex,
  onSelectAll,
  onClearAll,
  emptyMessage = "Enter a word first",
}: WordLetterPickerProps) {
  const letters = useMemo(() => extractLettersFromWord(word), [word]);

  if (letters.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-dashed text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSelectAll}
          className="text-xs px-2 py-1 rounded border border-primary/50 text-primary hover:bg-primary/10 transition-colors"
        >
          Select All
        </button>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs px-2 py-1 rounded border border-muted-foreground/50 text-muted-foreground hover:bg-muted transition-colors"
        >
          Clear All
        </button>
        <span className="text-xs text-muted-foreground self-center ml-auto">
          {selectedIndices.length} of {letters.length} selected
        </span>
      </div>

      {/* Letter grid - rendered RTL so position #1 (first letter read) is rightmost */}
      <div className="flex flex-wrap gap-2" dir="rtl">
        {letters.map((letter, index) => {
          const isSelected = selectedIndices.includes(index);

          return (
            <button
              key={`${letter}-${index}`}
              type="button"
              onClick={() => onToggleIndex(index)}
              className={cn(
                "min-w-14 px-2 py-2 rounded-lg border-2 transition-all",
                "flex flex-col items-center justify-center",
                isSelected
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
              )}
            >
              <span className="text-2xl font-arabic leading-none">{letter}</span>
              <span className="text-[10px] text-muted-foreground mt-1" dir="ltr">
                #{index + 1}
              </span>
            </button>
          );
        })}
      </div>

      {/* Visual representation of word with highlights */}
      {selectedIndices.length > 0 && (
        <div className="p-3 rounded-lg bg-muted/50 border">
          <p className="text-xs text-muted-foreground mb-2">
            Preview (selected letters highlighted):
          </p>
          <div className="text-3xl font-arabic text-right" dir="rtl">
            {letters.map((letter, index) => {
              const isSelected = selectedIndices.includes(index);
              return (
                <span
                  key={`${letter}-${index}`}
                  className={cn(
                    "inline-block",
                    isSelected && "bg-primary/20 text-primary rounded px-0.5"
                  )}
                >
                  {letter}
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
 *
 * Position-based model: authors pick one or more letter positions in the word,
 * each pinning a specific occurrence (letter + haraka + form). Derives the saved
 * selection on open for every stored shape (targetIndices, legacy targetLetterIndex,
 * and raw-string or object targetLetter), and writes targetIndices + targetCount +
 * a normalized LetterReference.
 */
export function TapActivityForm({
  config,
  onChange,
}: BaseActivityFormProps<TapActivityConfig>) {
  const { letters: allLetters } = useLetters();

  const targetWord = config?.targetWord || "";
  const wordMeaning = config?.wordMeaning || "";

  const updateConfig = (updates: Partial<TapActivityConfig>) => {
    onChange({ ...config, ...updates });
  };

  // Letters available to pick from (sourced from the target word), as logical
  // letters (base letter + trailing diacritics = one entry).
  const wordLetters = useMemo(() => extractLettersFromWord(targetWord), [targetWord]);

  // Resolve a stored `targetLetter` (object LetterReference OR raw character string)
  // to its base character, so we can locate it among the word's logical letters.
  const resolveTargetBaseChar = useCallback(
    (targetLetter: unknown): string | undefined => {
      if (isLetterReference(targetLetter)) {
        const letterData = allLetters.find((l) => l.id === targetLetter.letterId);
        return letterData?.letter;
      }
      if (typeof targetLetter === "string" && targetLetter.trim() !== "") {
        // Could be a letter ID or an actual character.
        const byId = allLetters.find((l) => l.id === targetLetter);
        if (byId) return byId.letter;
        return stripDiacritics(stripTatweel(targetLetter));
      }
      return undefined;
    },
    [allLetters]
  );

  // Derive the selected logical indices from config, supporting every stored shape:
  //   1. New format: config.targetIndices (authoritative).
  //   2. Legacy single-index hint: config.targetLetterIndex.
  //   3. Legacy targetLetter (object or string) with no index — locate it in the word.
  const selectedIndices = useMemo<number[]>(() => {
    // 1. New format.
    if (Array.isArray(config?.targetIndices) && config.targetIndices.length > 0) {
      return (config.targetIndices as number[]).filter(
        (i) => i >= 0 && i < wordLetters.length
      );
    }

    // 2. Legacy single-index hint.
    if (
      typeof config?.targetLetterIndex === "number" &&
      config.targetLetterIndex >= 0 &&
      config.targetLetterIndex < wordLetters.length
    ) {
      return [config.targetLetterIndex];
    }

    // 3. Derive from targetLetter by matching base characters in the word.
    const baseChar = resolveTargetBaseChar(config?.targetLetter);
    if (!baseChar) return [];

    const matches: number[] = [];
    wordLetters.forEach((letter, idx) => {
      if (stripDiacritics(letter) === baseChar) matches.push(idx);
    });

    if (matches.length === 0) return [];
    if (matches.length === 1) return matches;

    // Multiple occurrences: only auto-select all when the stored targetCount says so.
    // Otherwise it's ambiguous which occurrence was intended — leave unselected so the
    // author re-picks explicitly.
    const targetCount = config?.targetCount;
    if (typeof targetCount === "number" && targetCount === matches.length) {
      return matches;
    }
    return [];
  }, [config, wordLetters, resolveTargetBaseChar]);

  // Build a LetterReference for the letter at a given logical index.
  const buildLetterRef = useCallback(
    (index: number): LetterReference | undefined => {
      const letterWithHaraka = wordLetters[index];
      if (!letterWithHaraka) return undefined;

      const baseChar = stripDiacritics(letterWithHaraka);
      const haraka = extractHaraka(letterWithHaraka);
      const form = determineLetterForm();

      const letterData = allLetters.find((l) => l.letter === baseChar);
      if (!letterData) {
        console.warn(`Could not find letter ID for character: ${baseChar}`);
        return undefined;
      }

      return createLetterReference(letterData.id, form, haraka);
    },
    [wordLetters, allLetters]
  );

  // Persist a new set of selected indices: update targetIndices + targetCount, and
  // keep targetLetter (a LetterReference for the first selection) for display/audio.
  const commitIndices = useCallback(
    (indices: number[]) => {
      const sorted = [...indices].sort((a, b) => a - b);

      // Drop the legacy single-index hint; targetIndices is now authoritative.
      const { targetLetterIndex: _removed, ...rest } = config ?? ({} as TapActivityConfig);

      if (sorted.length === 0) {
        const { targetLetter: _t, ...withoutLetter } = rest;
        onChange({ ...withoutLetter, targetIndices: [], targetCount: 1 });
        return;
      }

      const firstRef = buildLetterRef(sorted[0]);
      onChange({
        ...rest,
        targetIndices: sorted,
        targetCount: sorted.length,
        ...(firstRef ? { targetLetter: firstRef } : {}),
      });
    },
    [config, onChange, buildLetterRef]
  );

  const handleToggleIndex = useCallback(
    (index: number) => {
      const set = new Set(selectedIndices);
      if (set.has(index)) {
        set.delete(index);
      } else {
        set.add(index);
      }
      commitIndices(Array.from(set));
    },
    [selectedIndices, commitIndices]
  );

  const handleSelectAll = useCallback(
    () => commitIndices(wordLetters.map((_, i) => i)),
    [commitIndices, wordLetters]
  );

  const handleClear = useCallback(() => commitIndices([]), [commitIndices]);

  // Changing the word invalidates any position-based selection — clear it.
  const handleWordChange = (word: string, wordData?: { english?: string | null }) => {
    const {
      targetLetter: _t,
      targetLetterIndex: _i,
      ...rest
    } = config ?? ({} as TapActivityConfig);
    onChange({
      ...rest,
      targetWord: word,
      wordMeaning: wordData?.english || wordMeaning,
      targetIndices: [],
      targetCount: 1,
    });
  };

  // Human-readable summary of the current selection.
  const selectedLettersDisplay = selectedIndices
    .slice()
    .sort((a, b) => a - b)
    .map((i) => wordLetters[i])
    .filter(Boolean);

  return (
    <div className="space-y-4">
      <FormField
        label="Target Word"
        hint="The Arabic word containing the letter(s) to find"
        required
      >
        <WordSelector
          value={targetWord}
          onChange={handleWordChange}
          showTranslation
          translationValue={wordMeaning}
          onTranslationChange={(value) => updateConfig({ wordMeaning: value })}
          placeholder="Type to search word library..."
        />
      </FormField>

      <FormField
        label="Target Letters"
        hint="Tap each letter the child must find. Selecting a position pins that exact letter (form + haraka + occurrence)."
        required
      >
        <WordLetterPicker
          word={targetWord}
          selectedIndices={selectedIndices}
          onToggleIndex={handleToggleIndex}
          onSelectAll={handleSelectAll}
          onClearAll={handleClear}
          emptyMessage="Enter a target word first to see available letters"
        />
        {selectedLettersDisplay.length > 0 && (
          <p className="text-xs text-primary mt-1">
            Selected {selectedLettersDisplay.length}:{" "}
            {selectedLettersDisplay.map((l) => `"${l}"`).join(", ")}
          </p>
        )}
      </FormField>
    </div>
  );
}
