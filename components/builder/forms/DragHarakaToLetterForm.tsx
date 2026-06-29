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
  /** Wrong harakat scattered as draggable options (multi-haraka mode). */
  distractorHarakat?: HarakaType[];
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
  const distractorHarakat = config?.distractorHarakat || [];
  const [useHarakaDistractors, setUseHarakaDistractors] = React.useState(
    Array.isArray(config?.distractorHarakat) &&
      config.distractorHarakat.length > 0
  );

  const updateConfig = (updates: Partial<DragHarakaConfig>) => {
    onChange({ ...config, ...updates });
  };

  // The Haraka Type selector shows 'fatha' pre-selected by default (above), but
  // that default is display-only — it isn't written to the config until the
  // author clicks a haraka. Persist it on mount so saving without an explicit
  // click still captures harakaType. Only writes when it's actually missing, so
  // existing activities and author selections are never overwritten.
  React.useEffect(() => {
    if (!config?.harakaType) {
      updateConfig({ harakaType });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getLetterDisplay = (ref: LetterReference | null): string => {
    return getLetterDisplayChar(ref, getLetter);
  };

  // Toggle a distractor haraka on/off. The target harakaType can never be a
  // distractor, so it's excluded from the options below.
  const toggleDistractorHaraka = (value: HarakaType) => {
    const next = distractorHarakat.includes(value)
      ? distractorHarakat.filter((h) => h !== value)
      : [...distractorHarakat, value];
    updateConfig({ distractorHarakat: next.length > 0 ? next : undefined });
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
              onClick={() =>
                updateConfig({
                  harakaType: haraka.value,
                  // A haraka can't be both target and distractor — prune it.
                  ...(distractorHarakat.includes(haraka.value)
                    ? {
                        distractorHarakat:
                          distractorHarakat.filter((h) => h !== haraka.value)
                            .length > 0
                            ? distractorHarakat.filter((h) => h !== haraka.value)
                            : undefined,
                      }
                    : {}),
                })
              }
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

      <FormField
        label="Haraka Options"
        hint="Add wrong harakat so the student must pick the correct one to drag"
      >
        <label className="flex items-center gap-2 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={useHarakaDistractors}
            onChange={(e) => {
              const on = e.target.checked;
              setUseHarakaDistractors(on);
              if (!on) updateConfig({ distractorHarakat: undefined });
            }}
            className="w-4 h-4 text-primary"
          />
          <span className="text-sm">Add distractor harakat</span>
          <span className="text-xs text-muted-foreground">
            (scatter wrong harakat to choose from)
          </span>
        </label>

        {useHarakaDistractors && (
          <div className="grid grid-cols-5 gap-2">
            {HARAKA_OPTIONS.map((haraka) => {
              const isTarget = haraka.value === harakaType;
              const selected = distractorHarakat.includes(haraka.value);
              return (
                <button
                  key={haraka.value}
                  type="button"
                  disabled={isTarget}
                  onClick={() => toggleDistractorHaraka(haraka.value)}
                  title={isTarget ? "This is the target haraka" : undefined}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all",
                    isTarget
                      ? "border-green-400 bg-green-50 dark:bg-green-900/20 opacity-60 cursor-not-allowed"
                      : selected
                      ? "border-primary bg-primary/10 shadow-md"
                      : "border-border hover:border-primary/50 hover:bg-muted"
                  )}
                >
                  <span className="text-3xl font-arabic mb-1">
                    {"ب" + haraka.char}
                  </span>
                  <span className="text-xs font-medium">{haraka.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {isTarget ? "target" : selected ? "distractor" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </FormField>

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
