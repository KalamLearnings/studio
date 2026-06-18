"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormField, NumberInput } from "../FormField";
import { LetterSelector } from "./LetterSelector";
import { GameSpeedSelector } from "./GameSpeedSelector";
import { AudioPickerField } from "./AudioPickerField";
import type {
  BaseActivityFormProps,
  LetterReference,
  LetterPosition,
  TargetLetterConfig,
} from "../types";

const LETTER_POSITIONS: { value: LetterPosition; label: string }[] = [
  { value: "isolated", label: "Isolated" },
  { value: "initial", label: "Initial" },
  { value: "medial", label: "Medial" },
  { value: "final", label: "Final" },
];

interface TargetLetterWithDistractorsFormProps
  extends BaseActivityFormProps<TargetLetterConfig> {
  labels: {
    targetLetterLabel?: string;
    targetLetterHint?: string;
    targetCountLabel?: string;
    targetCountHint?: string;
  };
  /** Field name for target letter in config (default: 'targetLetter') */
  targetLetterField?: string;
  /** Whether to show letter positions selector */
  showLetterPositions?: boolean;
  /** Whether target letter supports multi-select */
  targetLetterMultiSelect?: boolean;
  /** Whether to show game speed selector */
  showSpeedConfig?: boolean;
  /** Field name for speed in config (default: 'speed') */
  speedField?: string;
  /** Whether to show an audio picker for the target letter's sound */
  showTargetAudio?: boolean;
}

/**
 * Shared form component for activities that need:
 * - Target letter(s) selection
 * - Distractor letters selection
 * - Optional letter positions
 * - Target count and duration
 */
export function TargetLetterWithDistractorsForm({
  config,
  onChange,
  topic,
  labels,
  targetLetterField = "targetLetter",
  showLetterPositions = true,
  targetLetterMultiSelect = false,
  showSpeedConfig = false,
  speedField = "speed",
  showTargetAudio = false,
}: TargetLetterWithDistractorsFormProps) {
  const targetLetter: LetterReference | LetterReference[] | null =
    (config?.[targetLetterField] as LetterReference | LetterReference[] | null) || null;
  const distractorLetters: LetterReference[] =
    (config?.distractorLetters as LetterReference[]) || [];
  const targetCount = config?.targetCount ?? "";
  const duration = config?.duration ?? "";
  const letterPositions: LetterPosition[] =
    (config?.letterPositions as LetterPosition[]) || ["isolated"];
  const speed = (config?.[speedField] as number) ?? 1.0;
  const targetLetterAudioUrl =
    (config?.targetLetterAudioUrl as string | undefined) || undefined;
  const targetLetterAudioId =
    (config?.targetLetterAudioId as string | undefined) || undefined;

  const updateConfig = (updates: Record<string, unknown>) => {
    onChange({ ...config, ...updates } as TargetLetterConfig);
  };

  const toggleLetterPosition = (position: LetterPosition) => {
    const newPositions = letterPositions.includes(position)
      ? letterPositions.filter((p) => p !== position)
      : [...letterPositions, position];
    // Ensure at least one position is selected
    if (newPositions.length > 0) {
      updateConfig({ letterPositions: newPositions });
    }
  };

  return (
    <div className="space-y-4">
      <FormField
        label={labels.targetLetterLabel || "Target Letter"}
        hint={labels.targetLetterHint || "Select the target letter and form"}
        required
      >
        {targetLetterMultiSelect ? (
          <LetterSelector
            value={
              Array.isArray(targetLetter)
                ? targetLetter
                : targetLetter
                ? [targetLetter]
                : []
            }
            onChange={(value) =>
              updateConfig({ [targetLetterField]: value })
            }
            multiSelect
            multiFormSelect
          />
        ) : (
          <LetterSelector
            value={targetLetter}
            onChange={(value) =>
              updateConfig({ [targetLetterField]: value })
            }
            topic={topic}
            showFormSelector={true}
            multiFormSelect
          />
        )}
      </FormField>

      {showTargetAudio && (
        <AudioPickerField
          label="Target Letter Audio"
          hint="The sound played for the target letter (learners match this audio)"
          value={targetLetterAudioUrl}
          audioId={targetLetterAudioId}
          onChange={(url, id) =>
            updateConfig({
              targetLetterAudioUrl: url,
              targetLetterAudioId: id,
            })
          }
        />
      )}

      <FormField
        label="Distractor Letters"
        hint="Select letters that will appear as incorrect options"
        required
      >
        <LetterSelector
          value={distractorLetters}
          onChange={(value) =>
            updateConfig({ distractorLetters: value })
          }
          multiSelect
          multiFormSelect
        />
      </FormField>

      {showLetterPositions && (
        <FormField
          label="Letter Positions"
          hint="Select which letter forms to include"
        >
          <div className="grid grid-cols-4 gap-2">
            {LETTER_POSITIONS.map((pos) => (
              <button
                key={pos.value}
                type="button"
                onClick={() => toggleLetterPosition(pos.value)}
                className={cn(
                  "px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                  letterPositions.includes(pos.value)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
                )}
              >
                {pos.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {letterPositions.length === 1 &&
              `Only ${letterPositions[0]} form will be shown`}
            {letterPositions.length > 1 &&
              `${letterPositions.length} letter forms will appear randomly`}
          </p>
        </FormField>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label={labels.targetCountLabel || "Target Count"}
          hint={
            labels.targetCountHint ||
            "Number of correct responses to complete"
          }
        >
          <NumberInput
            value={targetCount}
            onChange={(value) =>
              updateConfig({ targetCount: value || undefined })
            }
            min={1}
            placeholder="e.g., 5"
          />
        </FormField>

        <FormField
          label="Duration (seconds)"
          hint="Time limit for the activity"
        >
          <NumberInput
            value={duration}
            onChange={(value) =>
              updateConfig({ duration: value || undefined })
            }
            min={10}
            placeholder="e.g., 60"
          />
        </FormField>
      </div>

      {showSpeedConfig && (
        <GameSpeedSelector
          value={speed}
          onChange={(value) => updateConfig({ [speedField]: value })}
        />
      )}
    </div>
  );
}
