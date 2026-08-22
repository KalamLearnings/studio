"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormField, WordSelector } from "./shared";
import type { BaseActivityFormProps } from "./types";

type HarakaType = "fatha" | "damma" | "kasra" | "sukoon" | "shadda";

interface DragHarakaToWordConfig {
  word?: {
    wordId?: string;
    text?: string;
  };
  blankIndices?: number[];
  distractorHarakat?: HarakaType[];
}

/** Combining marks, and the name shown to the author. */
const HARAKA_MARKS: Record<HarakaType, string> = {
  fatha: "َ",
  damma: "ُ",
  kasra: "ِ",
  sukoon: "ْ",
  shadda: "ّ",
};

const HARAKA_LABELS: Record<HarakaType, string> = {
  fatha: "Fatha",
  damma: "Damma",
  kasra: "Kasra",
  sukoon: "Sukoon",
  shadda: "Shadda",
};

const MARK_TO_HARAKA: Record<string, HarakaType> = Object.fromEntries(
  Object.entries(HARAKA_MARKS).map(([h, m]) => [m, h as HarakaType])
) as Record<string, HarakaType>;

/**
 * Split a word into per-letter units (base letter plus its combining marks) —
 * the same split the app performs at render time, so the positions the author
 * picks here are the positions the child sees.
 */
function wordLetterUnits(text: string): string[] {
  const units: string[] = [];
  for (const ch of text.normalize("NFKC")) {
    // A combining mark belongs to the preceding letter, so it doesn't advance.
    if (/[ً-ٰٟ]/.test(ch) && units.length > 0) {
      units[units.length - 1] += ch;
    } else {
      units.push(ch);
    }
  }
  return units;
}

/** The haraka a unit carries, or null. Shadda pairs with a vowel; the vowel wins. */
function harakaOfUnit(unit: string): HarakaType | null {
  const found = unit
    .split("")
    .map((ch) => MARK_TO_HARAKA[ch])
    .filter((h): h is HarakaType => Boolean(h));
  if (found.length === 0) return null;
  return found.find((h) => h !== "shadda") ?? found[0];
}

export function DragHarakaToWordActivityForm({
  config,
  onChange,
}: BaseActivityFormProps<DragHarakaToWordConfig>) {
  const wordText = config?.word?.text ?? "";
  const blankIndices = React.useMemo(
    () => config?.blankIndices ?? [],
    [config?.blankIndices]
  );
  const distractorHarakat = config?.distractorHarakat ?? [];

  const units = React.useMemo(() => wordLetterUnits(wordText), [wordText]);

  const handleWordChange = React.useCallback(
    (word: string, wordData?: { id?: string }) => {
      // Positions refer to the old word, so clear them when the word changes.
      onChange({
        ...config,
        word: { wordId: wordData?.id, text: word },
        blankIndices: [],
      });
    },
    [config, onChange]
  );

  const toggleIndex = React.useCallback(
    (index: number) => {
      const next = blankIndices.includes(index)
        ? blankIndices.filter((i) => i !== index)
        : [...blankIndices, index].sort((a, b) => a - b);
      onChange({ ...config, blankIndices: next });
    },
    [blankIndices, config, onChange]
  );

  // Letters are picked by INDEX, never by character: a word can repeat a
  // letter (مَرْيَم, مُحَمَّد) and the two occurrences must stay distinct.
  // Displayed right-to-left to match reading order.
  const displayOrder = React.useMemo(
    () => units.map((_, i) => i).reverse(),
    [units]
  );

  const toggleDistractor = React.useCallback(
    (haraka: HarakaType) => {
      const next = distractorHarakat.includes(haraka)
        ? distractorHarakat.filter((h) => h !== haraka)
        : [...distractorHarakat, haraka];
      onChange({ ...config, distractorHarakat: next });
    },
    [distractorHarakat, config, onChange]
  );

  const answers = blankIndices
    .map((i) => harakaOfUnit(units[i] ?? ""))
    .filter((h): h is HarakaType => h !== null);

  const invalidBlanks = blankIndices.filter(
    (i) => i >= units.length || harakaOfUnit(units[i] ?? "") === null
  );

  return (
    <div className="space-y-4">
      <FormField
        label="Word"
        required
        hint="Enter the word FULLY VOWELLED. It is the answer key — the marks you hide below are read back from it, so the word and the correct answer can never disagree."
      >
        <WordSelector
          value={wordText}
          onChange={handleWordChange}
          label=""
          required
          placeholder="Type to search or enter a fully vowelled word..."
        />
      </FormField>

      <FormField
        label="Letters to blank"
        required
        hint="Tap a letter to hide its haraka. The child drags that mark back onto it. Hiding one letter vowels a single letter; hiding several vowels the whole word."
      >
        {units.length === 0 ? (
          <div className="p-4 bg-muted/50 border border-dashed rounded-lg text-center text-muted-foreground">
            Enter a word first to choose which letters to blank
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-2" dir="rtl">
            {displayOrder.map((index) => {
              const unit = units[index];
              const haraka = harakaOfUnit(unit);
              const selected = blankIndices.includes(index);
              const selectable = haraka !== null;

              return (
                <button
                  key={index}
                  type="button"
                  disabled={!selectable}
                  onClick={() => toggleIndex(index)}
                  title={
                    selectable
                      ? `Position ${index + 1} — ${HARAKA_LABELS[haraka]}`
                      : `Position ${index + 1} — no haraka to hide`
                  }
                  className={cn(
                    "aspect-square flex flex-col items-center justify-center rounded-lg border-2 transition-all",
                    selectable && "hover:scale-105",
                    !selectable && "opacity-40 cursor-not-allowed",
                    selected
                      ? "border-primary bg-primary/10 shadow-md"
                      : "border-border hover:border-primary/50 hover:bg-muted"
                  )}
                >
                  <span className="text-3xl font-arabic leading-none">
                    {selected ? unit.replace(/[ً-ٰٟ]/g, "") : unit}
                  </span>
                  <span className="mt-1 text-[10px] text-muted-foreground">
                    #{index + 1}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </FormField>

      {/* What the child will actually be asked to place, derived from the word
          exactly as the app derives it. */}
      {wordText.length > 0 && (
        <div
          className={
            blankIndices.length > 0 && invalidBlanks.length === 0
              ? "rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300"
          }
        >
          {blankIndices.length === 0 ? (
            <>
              No letters blanked yet — pick at least one, otherwise there is
              nothing for the child to place.
            </>
          ) : invalidBlanks.length > 0 ? (
            <>
              Position{invalidBlanks.length > 1 ? "s" : ""}{" "}
              <strong>
                {invalidBlanks.map((i) => `#${i + 1}`).join(", ")}
              </strong>{" "}
              carr{invalidBlanks.length > 1 ? "y" : "ies"} no haraka, so there
              is nothing to drag back. Vowel {invalidBlanks.length > 1 ? "those letters" : "that letter"} or pick another.
            </>
          ) : (
            <>
              The child will place{" "}
              <strong>
                {answers.map((h) => HARAKA_LABELS[h]).join(", ")}
              </strong>{" "}
              on letter{blankIndices.length > 1 ? "s" : ""}{" "}
              <strong>
                {blankIndices.map((i) => `#${i + 1}`).join(", ")}
              </strong>
              .
            </>
          )}
        </div>
      )}

      <FormField
        label="Distractor harakat"
        hint="Extra marks offered in the tray alongside the correct one. Leave empty to offer only the answer."
      >
        <div className="grid grid-cols-5 gap-2">
          {(Object.keys(HARAKA_LABELS) as HarakaType[]).map((haraka) => {
            const isAnswer = answers.includes(haraka);
            const selected = distractorHarakat.includes(haraka);
            return (
              <button
                key={haraka}
                type="button"
                disabled={isAnswer}
                onClick={() => toggleDistractor(haraka)}
                title={isAnswer ? "This is the correct haraka" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all",
                  isAnswer
                    ? "border-green-400 bg-green-50 dark:bg-green-900/20 opacity-60 cursor-not-allowed"
                    : selected
                      ? "border-primary bg-primary/10 shadow-md"
                      : "border-border hover:border-primary/50 hover:bg-muted"
                )}
              >
                <span className="text-3xl font-arabic mb-1">
                  {"\u0628" + HARAKA_MARKS[haraka]}
                </span>
                <span className="text-xs font-medium">
                  {HARAKA_LABELS[haraka]}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {isAnswer ? "answer" : selected ? "distractor" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </FormField>

    </div>
  );
}
