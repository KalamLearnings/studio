"use client";

import * as React from "react";
import { FormField, LetterSelector, HarakaChoiceGrid } from "./shared";
import { useLetters, getLetterDisplayChar } from "@/lib/hooks/useLetters";
import {
  HARAKA_IDS,
  HARAKA_META,
  applyHaraka,
  type HarakaType,
} from "@kalam/curriculum-schemas";
import type { BaseActivityFormProps, LetterReference } from "./types";

interface DragHarakaConfig {
  targetLetter?: LetterReference | null;
  harakaType?: HarakaType;
  distractorLetters?: LetterReference[];
  /** Wrong harakat scattered as draggable options (multi-haraka mode). */
  distractorHarakat?: HarakaType[];
}

const MAX_DISTRACTOR_HARAKAT = 4;

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
  const harakaType: HarakaType = config?.harakaType || "fatha";
  const distractorLetters = config?.distractorLetters || [];
  const distractorHarakat = config?.distractorHarakat || [];
  const [useHarakaDistractors, setUseHarakaDistractors] = React.useState(
    Array.isArray(config?.distractorHarakat) &&
      config.distractorHarakat.length > 0
  );

  const updateConfig = (updates: Partial<DragHarakaConfig>) => {
    onChange({ ...config, ...updates });
  };

  // The grid shows 'fatha' pre-selected by default, but that default is
  // display-only until persisted. Write it on mount so saving without an
  // explicit click still captures harakaType; never overwrite an existing one.
  React.useEffect(() => {
    if (!config?.harakaType) {
      updateConfig({ harakaType });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getLetterDisplay = (ref: LetterReference | null): string => {
    return getLetterDisplayChar(ref, getLetter);
  };

  const selectTarget = (value: HarakaType) => {
    const pruned = distractorHarakat.filter((h) => h !== value);
    updateConfig({
      harakaType: value,
      distractorHarakat: pruned.length > 0 ? pruned : undefined,
    });
  };

  const toggleDistractorHaraka = (value: HarakaType) => {
    const next = distractorHarakat.includes(value)
      ? distractorHarakat.filter((h) => h !== value)
      : [...distractorHarakat, value];
    updateConfig({ distractorHarakat: next.length > 0 ? next : undefined });
  };

  const distractorsFull = distractorHarakat.length >= MAX_DISTRACTOR_HARAKAT;
  const distractorDisabledIds: HarakaType[] = [
    harakaType,
    ...(distractorsFull
      ? HARAKA_IDS.filter((h) => !distractorHarakat.includes(h))
      : []),
  ];

  const targetLetterDisplay = getLetterDisplay(targetLetter);
  const harakaInfo = HARAKA_META[harakaType];

  return (
    <div className="space-y-6">
      <FormField
        label="Haraka Type"
        hint="The diacritical mark students will drag onto the letter. Turn on Shadda to offer a doubled letter with its vowel."
        required
      >
        <HarakaChoiceGrid value={[harakaType]} onSelect={selectTarget} />
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
          showHarakaSelector={false}
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
            showHarakaSelector={false}
            disabledLetterIds={targetLetter ? [targetLetter.letterId] : []}
          />
        </FormField>
      )}

      <FormField
        label="Haraka Options"
        hint={`Add wrong harakat so the student must pick the correct one to drag (up to ${MAX_DISTRACTOR_HARAKAT})`}
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
          <HarakaChoiceGrid
            value={distractorHarakat}
            onSelect={toggleDistractorHaraka}
            disabledIds={distractorDisabledIds}
            disabledHint={
              distractorsFull
                ? `At most ${MAX_DISTRACTOR_HARAKAT} distractors`
                : "This is the target haraka"
            }
            disabledCaption={distractorsFull ? undefined : "target"}
            selectedCaption="distractor"
          />
        )}
      </FormField>

      {targetLetter && harakaType && (
        <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg">
          <p className="text-sm font-medium mb-3">Preview</p>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Students drag</p>
              <span className="text-5xl font-arabic text-pink-500">
                {"◌" + harakaInfo.marks}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                {harakaInfo.label}
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
