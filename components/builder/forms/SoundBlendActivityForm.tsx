"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormField, TextInput, LetterSelector, Checkbox, WordSelector } from "./shared";
import { useLetters } from "@/lib/hooks/useLetters";
import type { BaseActivityFormProps, LetterReference } from "./types";

type SoundDuration = 1 | 2 | 3;
type BlendSpeed = "none" | "slow" | "fast";
type BlendContentType = "letter" | "word";

interface SoundSegment {
  sound: string;
  duration: SoundDuration;
}

interface SoundBlendConfig {
  contentType?: BlendContentType;
  word?: string;
  segments?: SoundSegment[];
  speed?: BlendSpeed;
  requiredSlides?: number;
  showBothSpeeds?: boolean;
  transliteration?: string;
  meaning?: string;
}

const HARAKAT = new Set([
  "ً", "ٌ", "ٍ", "َ", "ُ", "ِ",
  "ّ", "ْ", "ٓ", "ٔ", "ٕ", "ٰ",
]);

const FATHA = "َ";
const DAMMA = "ُ";
const KASRA = "ِ";
const SUKUN = "ْ";
const ALEF = "ا";
const WAW = "و";
const YA = "ي";

const ISOLATED_FORMS: Record<string, string> = {
  "ا": "ﺍ", "أ": "ﺃ", "إ": "ﺇ", "آ": "ﺁ", "ب": "ﺏ", "ت": "ﺕ",
  "ث": "ﺙ", "ج": "ﺝ", "ح": "ﺡ", "خ": "ﺥ", "د": "ﺩ", "ذ": "ﺫ",
  "ر": "ﺭ", "ز": "ﺯ", "س": "ﺱ", "ش": "ﺵ", "ص": "ﺹ", "ض": "ﺽ",
  "ط": "ﻁ", "ظ": "ﻅ", "ع": "ﻉ", "غ": "ﻍ", "ف": "ﻑ", "ق": "ﻕ",
  "ك": "ﻙ", "ل": "ﻝ", "م": "ﻡ", "ن": "ﻥ", "ه": "ﻩ", "و": "ﻭ",
  "ي": "ﻱ", "ى": "ﻯ", "ة": "ﺓ", "ء": "ء", "ئ": "ﺉ", "ؤ": "ﺅ",
};

function toIsolatedForm(letter: string): string {
  return ISOLATED_FORMS[letter] || letter;
}

function parseWordIntoSegments(word: string): { baseLetter: string; harakat: string }[] {
  const segments: { baseLetter: string; harakat: string }[] = [];
  const chars = Array.from(word);
  let i = 0;

  while (i < chars.length) {
    const char = chars[i];
    if (HARAKAT.has(char)) {
      i++;
      continue;
    }

    let harakat = "";
    let j = i + 1;
    while (j < chars.length && HARAKAT.has(chars[j])) {
      harakat += chars[j];
      j++;
    }

    segments.push({ baseLetter: char, harakat });
    i = j;
  }

  return segments;
}

function detectDuration(
  segment: { baseLetter: string; harakat: string },
  isLast: boolean,
  nextSegment?: { baseLetter: string; harakat: string }
): SoundDuration {
  const { harakat } = segment;

  if (harakat.includes(SUKUN)) return 1;
  if (isLast && !harakat) return 1;

  if (nextSegment) {
    const nextLetter = nextSegment.baseLetter;
    if (harakat.includes(FATHA) && nextLetter === ALEF) return 3;
    if (harakat.includes(DAMMA) && nextLetter === WAW) return 3;
    if (harakat.includes(KASRA) && nextLetter === YA) return 3;
  }

  return 2;
}

function autoDetectSegments(word: string, useIsolated: boolean = false): SoundSegment[] {
  if (!word) return [];

  const parsed = parseWordIntoSegments(word);
  const segments: SoundSegment[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const segment = parsed[i];
    const isLast = i === parsed.length - 1;
    const nextSegment = i < parsed.length - 1 ? parsed[i + 1] : undefined;
    const duration = detectDuration(segment, isLast, nextSegment);
    const letter = useIsolated ? toIsolatedForm(segment.baseLetter) : segment.baseLetter;
    const sound = letter + segment.harakat;
    segments.push({ sound, duration });
  }

  return segments;
}

const DURATION_LABELS: Record<SoundDuration, { label: string; icon: string; color: string }> = {
  1: { label: "Stop", icon: "●", color: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700" },
  2: { label: "Short", icon: "▬", color: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700" },
  3: { label: "Long", icon: "▬▬", color: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700" },
};

export function SoundBlendActivityForm({
  config,
  onChange,
  topic,
}: BaseActivityFormProps<SoundBlendConfig>) {
  const { letters } = useLetters();

  const contentType: BlendContentType = config?.contentType || "word";
  const word = config?.word || "";
  const segments = config?.segments || [];
  const speed: BlendSpeed = config?.speed || (contentType === "letter" ? "none" : "slow");
  const requiredSlides = config?.requiredSlides || 2;
  const showBothSpeeds = config?.showBothSpeeds || false;
  const transliteration = config?.transliteration || "";
  const meaning = config?.meaning || "";

  const updateConfig = React.useCallback(
    (updates: Partial<SoundBlendConfig>) => {
      onChange({ ...config, ...updates });
    },
    [config, onChange]
  );

  React.useEffect(() => {
    if (word && segments.length === 0 && contentType === "word") {
      const useIsolated = speed === "slow";
      const detected = autoDetectSegments(word, useIsolated);
      if (detected.length > 0) {
        updateConfig({ segments: detected });
      }
    }
  }, [word]);

  React.useEffect(() => {
    if (word && segments.length > 0 && contentType === "word" && speed !== "none") {
      const useIsolated = speed === "slow";
      const detected = autoDetectSegments(word, useIsolated);
      updateConfig({ segments: detected });
    }
  }, [speed]);

  const handleContentTypeChange = (newContentType: BlendContentType) => {
    if (newContentType === "letter") {
      updateConfig({
        contentType: newContentType,
        word: "",
        segments: [],
        speed: "none",
      });
    } else {
      updateConfig({
        contentType: newContentType,
        word: "",
        segments: [],
        speed: "slow",
      });
    }
  };

  const handleWordChange = (newWord: string) => {
    const useIsolated = speed === "slow";
    const detected = autoDetectSegments(newWord, useIsolated);
    updateConfig({ word: newWord, segments: detected });
  };

  const handleLetterSelect = (ref: LetterReference | LetterReference[] | null) => {
    if (!ref || Array.isArray(ref)) return;

    const letterData = letters.find((l) => l.id === ref.letterId);
    if (!letterData) return;

    const letterChar = letterData.forms?.[ref.form] || letterData.letter;
    const segment: SoundSegment = { sound: letterChar, duration: 2 };

    updateConfig({
      word: letterChar,
      segments: [segment],
    });
  };

  const handleSegmentDurationChange = (index: number, duration: SoundDuration) => {
    const newSegments = [...segments];
    newSegments[index] = { ...newSegments[index], duration };
    updateConfig({ segments: newSegments });
  };

  const handleRedetect = () => {
    const useIsolated = speed === "slow";
    const detected = autoDetectSegments(word, useIsolated);
    updateConfig({ segments: detected });
  };

  const getSpeedHint = () => {
    switch (speed) {
      case "slow":
        return "Slow: Turtle slider for beginners";
      case "fast":
        return "Fast: Rabbit slider for advanced readers";
      case "none":
        return "No speed indicator (square slider)";
      default:
        return "Select a speed mode";
    }
  };

  return (
    <div className="space-y-6">
      <FormField
        label="Content Type"
        hint="Choose whether to blend a single letter or a full word"
        required
      >
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleContentTypeChange("letter")}
            className={cn(
              "flex flex-col items-center gap-1 px-6 py-3 rounded-lg border-2 transition-all min-w-[120px]",
              contentType === "letter"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
          >
            <span className="text-2xl font-arabic">ب</span>
            <span className="font-medium">Letter</span>
          </button>
          <button
            type="button"
            onClick={() => handleContentTypeChange("word")}
            className={cn(
              "flex flex-col items-center gap-1 px-6 py-3 rounded-lg border-2 transition-all min-w-[120px]",
              contentType === "word"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
          >
            <span className="text-2xl font-arabic">كلمة</span>
            <span className="font-medium">Word</span>
          </button>
        </div>
      </FormField>

      {contentType === "letter" && (
        <FormField label="Select Letter" hint="Choose the letter to blend" required>
          <LetterSelector
            topic={topic}
            showFormSelector
            value={null}
            onChange={handleLetterSelect}
          />
        </FormField>
      )}

      {contentType === "word" && (
        <WordSelector
          value={word}
          onChange={(value) => handleWordChange(value)}
          label="Arabic Word"
          required
          placeholder="Type to search word library..."
        />
      )}

      {segments.length > 0 && (
        <FormField
          label="Sound Segments"
          hint="Duration: Stop (dot), Short (small bar), Long (big bar)"
        >
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 justify-end" dir="rtl">
              {segments.map((segment, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center gap-2 p-3 bg-muted rounded-lg border"
                >
                  <span className="font-arabic text-2xl">{segment.sound}</span>
                  <div className="flex gap-1">
                    {([1, 2, 3] as SoundDuration[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleSegmentDurationChange(index, d)}
                        className={cn(
                          "px-2 py-1 text-xs font-medium rounded border transition-all",
                          segment.duration === d
                            ? DURATION_LABELS[d].color
                            : "bg-background text-muted-foreground border-border hover:border-muted-foreground"
                        )}
                        title={DURATION_LABELS[d].label}
                      >
                        {DURATION_LABELS[d].icon}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {contentType === "word" && (
              <button
                type="button"
                onClick={handleRedetect}
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Re-detect durations
              </button>
            )}

            <div className="flex gap-4 text-xs text-muted-foreground border-t pt-3">
              <div className="flex items-center gap-1">
                <span className="text-red-600 dark:text-red-400">●</span> Stop (sukun)
              </div>
              <div className="flex items-center gap-1">
                <span className="text-blue-600 dark:text-blue-400">▬</span> Short (voweled)
              </div>
              <div className="flex items-center gap-1">
                <span className="text-purple-600 dark:text-purple-400">▬▬</span> Long (madd)
              </div>
            </div>
          </div>
        </FormField>
      )}

      <FormField label="Reading Speed" hint={getSpeedHint()}>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => updateConfig({ speed: "none" })}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-3 rounded-lg border-2 transition-all min-w-[100px]",
              speed === "none"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
          >
            <span>None</span>
            <span className="text-xs text-muted-foreground">Square slider</span>
          </button>
          <button
            type="button"
            onClick={() => updateConfig({ speed: "slow" })}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-3 rounded-lg border-2 transition-all min-w-[100px]",
              speed === "slow"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
          >
            <span>Slow</span>
            <span className="text-xs text-muted-foreground">Turtle slider</span>
          </button>
          <button
            type="button"
            onClick={() => updateConfig({ speed: "fast" })}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-3 rounded-lg border-2 transition-all min-w-[100px]",
              speed === "fast"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
          >
            <span>Fast</span>
            <span className="text-xs text-muted-foreground">Rabbit slider</span>
          </button>
        </div>
      </FormField>

      <FormField label="Required Slides" hint="How many times must the child slide to complete">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={5}
            value={requiredSlides}
            onChange={(e) => updateConfig({ requiredSlides: parseInt(e.target.value) })}
            className="flex-1"
          />
          <span className="w-8 text-center font-medium">{requiredSlides}</span>
        </div>
      </FormField>

      <FormField
        label="Display Mode"
        hint="Show both turtle (slow) and rabbit (fast) sliders side by side"
      >
        <Checkbox
          checked={showBothSpeeds}
          onChange={(checked) => updateConfig({ showBothSpeeds: checked })}
          label="Show both speeds side by side"
        />
        {showBothSpeeds && (
          <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm">
              <strong>Preview:</strong> Both sliders will be shown - on tablets they
              appear side by side, on phones they stack vertically.
            </p>
          </div>
        )}
      </FormField>

      <div className="border-t pt-4 space-y-4">
        <h4 className="text-sm font-medium">Optional</h4>

        <FormField label="Transliteration" hint="e.g., 'jamal'">
          <TextInput
            value={transliteration}
            onChange={(value) => updateConfig({ transliteration: value })}
            placeholder="jamal"
          />
        </FormField>

        <FormField label="English Meaning" hint="e.g., 'camel'">
          <TextInput
            value={meaning}
            onChange={(value) => updateConfig({ meaning: value })}
            placeholder="camel"
          />
        </FormField>
      </div>
    </div>
  );
}
