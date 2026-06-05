"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormField, LetterSelector } from "./shared";
import { useLetters, getLetterDisplayChar, applyHaraka } from "@/lib/hooks/useLetters";
import type { BaseActivityFormProps, LetterReference } from "./types";

type HarakaType = "fatha" | "damma" | "kasra" | "sukoon" | "shadda";

interface DragHarakaConfig {
  targetLetter?: LetterReference | null;
  harakaType?: HarakaType;
  distractorLetters?: LetterReference[];
}

const HARAKA_OPTIONS: {
  value: HarakaType;
  label: string;
  arabic: string;
  char: string;
}[] = [
  { value: "fatha", label: "Fatha", arabic: "فَتْحَة", char: "َ" },
  { value: "damma", label: "Damma", arabic: "ضَمَّة", char: "ُ" },
  { value: "kasra", label: "Kasra", arabic: "كَسْرَة", char: "ِ" },
  { value: "sukoon", label: "Sukoon", arabic: "سُكُون", char: "ْ" },
  { value: "shadda", label: "Shadda", arabic: "شَدَّة", char: "ّ" },
];

export function DragHarakaToLetterForm({
  config,
  onChange,
  topic,
}: BaseActivityFormProps<DragHarakaConfig>) {
  const { getLetter } = useLetters();
  const [useDistractors, setUseDistractors] = React.useState(
    Array.isArray(config?.distractorLetters) &&
      config.distractorLetters.length > 0
  );

  const targetLetter = config?.targetLetter || null;
  const harakaType = config?.harakaType || "fatha";
  const distractorLetters = config?.distractorLetters || [];

  const updateConfig = (updates: Partial<DragHarakaConfig>) => {
    onChange({ ...config, ...updates });
  };

  const getLetterDisplay = (ref: LetterReference | null): string => {
    return getLetterDisplayChar(ref, getLetter);
  };

  const targetLetterDisplay = getLetterDisplay(targetLetter);
  const harakaInfo = HARAKA_OPTIONS.find((h) => h.value === harakaType);

  return (
    <div className="space-y-6">
      <FormField
        label="Haraka Type"
        hint="The diacritical mark students will drag onto the letter"
        required
      >
        <div className="grid grid-cols-5 gap-2">
          {HARAKA_OPTIONS.map((haraka) => (
            <button
              key={haraka.value}
              type="button"
              onClick={() => updateConfig({ harakaType: haraka.value })}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all",
                harakaType === haraka.value
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border hover:border-primary/50 hover:bg-muted"
              )}
            >
              <span className="text-3xl font-arabic mb-1">
                {"ب" + haraka.char}
              </span>
              <span className="text-xs font-medium">{haraka.label}</span>
              <span className="text-xs text-muted-foreground font-arabic">
                {haraka.arabic}
              </span>
            </button>
          ))}
        </div>
      </FormField>

      <FormField
        label="Target Letter"
        hint="The letter to place the haraka on"
        required
      >
        <LetterSelector
          value={targetLetter}
          onChange={(value) =>
            updateConfig({
              targetLetter: Array.isArray(value) ? value[0] : value,
            })
          }
          topic={topic}
          showFormSelector
        />
      </FormField>

      <FormField label="Activity Mode" hint="Single letter or multiple letters">
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="activityMode"
              checked={!useDistractors}
              onChange={() => {
                setUseDistractors(false);
                updateConfig({ distractorLetters: undefined });
              }}
              className="w-4 h-4 text-primary"
            />
            <span className="text-sm">Single Letter</span>
            <span className="text-xs text-muted-foreground">(One letter shown)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="activityMode"
              checked={useDistractors}
              onChange={() => setUseDistractors(true)}
              className="w-4 h-4 text-primary"
            />
            <span className="text-sm">Multi-letter</span>
            <span className="text-xs text-muted-foreground">(Scattered letters)</span>
          </label>
        </div>
      </FormField>

      {useDistractors && (
        <FormField
          label="Distractor Letters"
          hint="Wrong letters scattered around (2-6 letters)"
        >
          <LetterSelector
            value={distractorLetters}
            onChange={(value) =>
              updateConfig({
                distractorLetters: Array.isArray(value) ? value : value ? [value] : [],
              })
            }
            multiSelect
            showFormSelector
            disabledLetterIds={targetLetter ? [targetLetter.letterId] : []}
          />
        </FormField>
      )}

      {targetLetter && harakaType && (
        <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg">
          <p className="text-sm font-medium mb-3">Preview</p>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Students drag</p>
              <span className="text-5xl font-arabic text-pink-500">
                {harakaInfo?.char}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                {harakaInfo?.label}
              </p>
            </div>
            <div className="text-2xl text-muted-foreground">→</div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">To the letter</p>
              <span className="text-5xl font-arabic">{targetLetterDisplay}</span>
            </div>
            <div className="text-2xl text-muted-foreground">=</div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Result</p>
              <span className="text-5xl font-arabic">
                {applyHaraka(targetLetterDisplay, harakaType)}
              </span>
            </div>
          </div>
          {useDistractors && distractorLetters.length > 0 && (
            <div className="mt-4 pt-3 border-t border-primary/20">
              <p className="text-xs text-muted-foreground mb-2">
                Scattered letters (one correct + {distractorLetters.length}{" "}
                distractors)
              </p>
              <div className="flex gap-3 flex-wrap">
                <span className="text-2xl font-arabic px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded border border-green-300 dark:border-green-700">
                  {targetLetterDisplay}
                </span>
                {distractorLetters.map((ref, i) => (
                  <span
                    key={i}
                    className="text-2xl font-arabic px-3 py-1 bg-muted rounded border border-border"
                  >
                    {getLetterDisplay(ref)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
