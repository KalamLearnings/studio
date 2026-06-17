"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormField, TextInput, LetterSelector, Checkbox, WordSelector } from "./shared";
import { useLetters } from "@/lib/hooks/useLetters";
import { applyHaraka } from "@/lib/utils/letterReference";
import {
  autoDetectSegments,
  type SoundDuration,
  type SoundSegment,
} from "@/lib/utils/soundBlend";
import type { BaseActivityFormProps, LetterReference } from "./types";

type BlendSpeed = "none" | "slow" | "fast" | "segmented" | "blended" | "fluent";
type BlendContentType = "letter" | "word";

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

const DURATION_LABELS: Record<SoundDuration, { label: string; icon: string; color: string }> = {
  1: { label: "Stop", icon: "●", color: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700" },
  2: { label: "Short", icon: "▬", color: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700" },
  3: { label: "Long", icon: "▬▬", color: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700" },
};

type ReadingMode = "segmented" | "blended" | "fluent";

const READING_MODES: { mode: ReadingMode; emoji: string; label: string; sub: string }[] = [
  { mode: "segmented", emoji: "🐢", label: "Segmented", sub: "Isolated letters" },
  { mode: "blended", emoji: "🐇", label: "Blended", sub: "Contextual letters" },
  { mode: "fluent", emoji: "📖", label: "Fluent", sub: "Connected word" },
];

/** Normalize legacy speed values to the segmented/blended/fluent vocabulary. */
function normalizeSpeed(speed: BlendSpeed): ReadingMode {
  if (speed === "slow" || speed === "none") return "segmented";
  if (speed === "fast") return "blended";
  return speed;
}

export function SoundBlendActivityForm({
  config,
  onChange,
  topic,
}: BaseActivityFormProps<SoundBlendConfig>) {
  const { letters } = useLetters();

  const contentType: BlendContentType = config?.contentType || "word";
  const word = config?.word || "";
  const segments = config?.segments || [];
  const speed: BlendSpeed = config?.speed || (contentType === "letter" ? "none" : "segmented");
  // Treat legacy values as their modern equivalents for the picker UI.
  const normalizedSpeed = normalizeSpeed(speed);
  // Segmented mode shows letters in isolated forms; blended/fluent keep the
  // connected/contextual word.
  const useIsolatedForms = normalizedSpeed === "segmented";
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
      const detected = autoDetectSegments(word, useIsolatedForms);
      if (detected.length > 0) {
        updateConfig({ segments: detected });
      }
    }
    // Auto-detect only when the word itself changes.
  }, [word]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (word && segments.length > 0 && contentType === "word") {
      const detected = autoDetectSegments(word, useIsolatedForms);
      updateConfig({ segments: detected });
    }
    // Re-detect only when the reading mode changes (isolated vs connected forms).
  }, [speed]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleContentTypeChange = (newContentType: BlendContentType) => {
    if (newContentType === "letter") {
      updateConfig({
        contentType: newContentType,
        word: "",
        segments: [],
        speed: "none",
      });
    } else {
      // Switch to word mode: default to the first blending stage (segmented).
      updateConfig({
        contentType: newContentType,
        word: "",
        segments: [],
        speed: "segmented",
      });
    }
  };

  const handleWordChange = (newWord: string) => {
    const detected = autoDetectSegments(newWord, useIsolatedForms);
    updateConfig({ word: newWord, segments: detected });
  };

  const handleLetterSelect = (ref: LetterReference | LetterReference[] | null) => {
    if (!ref || Array.isArray(ref)) return;

    const letterData = letters.find((l) => l.id === ref.letterId);
    if (!letterData) return;

    // Get the letter form, then bake in the selected haraka. The sound_blend
    // schema stores the diacritic directly in the sound/word strings (e.g.
    // "عُ"), so the haraka from the picker MUST be applied here - otherwise the
    // letter renders bare in the app.
    const baseChar = letterData.forms?.[ref.form] || letterData.letter;
    const letterChar = applyHaraka(baseChar, ref.haraka);
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
    const detected = autoDetectSegments(word, useIsolatedForms);
    updateConfig({ segments: detected });
  };

  const getSpeedHint = () => {
    switch (normalizedSpeed) {
      case "segmented":
        return "Segmented: isolated letters, turtle slider (sound out each letter)";
      case "blended":
        return "Blended: contextual letter forms, rabbit slider";
      case "fluent":
        return "Fluent: connected whole word with a single filling bar";
      default:
        return "Select a reading mode";
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

      {/* Reading Mode — words only (letters always use the square slider). */}
      {contentType === "word" && (
        <FormField label="Reading Mode" hint={getSpeedHint()}>
          <div className="flex gap-3">
            {READING_MODES.map(({ mode, emoji, label, sub }) => (
              <button
                key={mode}
                type="button"
                onClick={() => updateConfig({ speed: mode })}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-3 rounded-lg border-2 transition-all min-w-[100px]",
                  normalizedSpeed === mode
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <span>{emoji}</span>
                  <span className="font-medium">{label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{sub}</span>
              </button>
            ))}
          </div>
        </FormField>
      )}

      {/* Progression toggle — words only. */}
      {contentType === "word" && (
        <FormField
          label="Display Mode"
          hint="Show the full blending progression (segmented → blended → fluent) in sequence"
        >
          <Checkbox
            checked={showBothSpeeds}
            onChange={(checked) => updateConfig({ showBothSpeeds: checked })}
            label="Show the full progression (segmented → blended → fluent)"
          />
          {showBothSpeeds && (
            <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm">
                <strong>Preview:</strong> The child progresses through all three stages -
                on tablets they appear side by side, on phones they sequence as pages.
              </p>
              <div className="flex gap-4 mt-2 justify-center">
                {READING_MODES.map(({ mode, emoji, label }) => (
                  <div key={mode} className="flex flex-col items-center gap-1">
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-xs">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </FormField>
      )}

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
