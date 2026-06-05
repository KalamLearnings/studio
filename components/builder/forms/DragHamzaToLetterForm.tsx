"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormField, LetterSelector, PreviewBox } from "./shared";
import { useLetters, letterFilters } from "@/lib/hooks/useLetters";
import type { BaseActivityFormProps, LetterReference } from "./types";

type HamzaPosition = "above" | "below" | "on_line";

interface DragHamzaConfig {
  targetLetter?: LetterReference | null;
  correctPosition?: HamzaPosition;
}

const HAMZA_POSITIONS: { value: HamzaPosition; label: string; example: string }[] = [
  { value: "above", label: "Above", example: "أ" },
  { value: "below", label: "Below", example: "إ" },
  { value: "on_line", label: "On Line", example: "ء" },
];

const HAMZA_RESULTS: Record<string, Record<HamzaPosition, string>> = {
  alif: { above: "أ", below: "إ", on_line: "ء" },
  waw: { above: "ؤ", below: "ء", on_line: "ء" },
  ya: { above: "ئ", below: "ء", on_line: "ء" },
};

export function DragHamzaToLetterForm({
  config,
  onChange,
  topic,
}: BaseActivityFormProps<DragHamzaConfig>) {
  const { getLetter } = useLetters();

  const targetLetter = config?.targetLetter || null;
  const correctPosition = config?.correctPosition || "above";

  const updateConfig = (updates: Partial<DragHamzaConfig>) => {
    onChange({ ...config, ...updates });
  };

  const getResultLetter = (letterId: string, position: HamzaPosition): string => {
    return HAMZA_RESULTS[letterId]?.[position] || "ء";
  };

  const getLetterDisplay = (): string => {
    if (!targetLetter) return "";
    const letterData = getLetter(targetLetter.letterId);
    return letterData?.letter || "";
  };

  return (
    <div className="space-y-6">
      <FormField
        label="Target Letter"
        hint="Select the letter to place hamza on (Alif, Waw, or Ya)"
        required
      >
        <LetterSelector
          value={targetLetter}
          onChange={(value) =>
            updateConfig({ targetLetter: Array.isArray(value) ? value[0] : value })
          }
          topic={topic}
          showFormSelector={false}
          letterFilter={letterFilters.hamzaCarriers}
        />
      </FormField>

      <FormField
        label="Correct Hamza Position"
        hint="Where the hamza should be placed"
        required
      >
        <div className="grid grid-cols-3 gap-3">
          {HAMZA_POSITIONS.map((pos) => (
            <button
              key={pos.value}
              type="button"
              onClick={() => updateConfig({ correctPosition: pos.value })}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all",
                correctPosition === pos.value
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border hover:border-primary/50 hover:bg-muted"
              )}
            >
              <span className="text-4xl font-arabic mb-2">{pos.example}</span>
              <span className="text-sm font-medium">{pos.label}</span>
            </button>
          ))}
        </div>
      </FormField>

      {targetLetter && correctPosition && (
        <PreviewBox variant="preview" title="Preview">
          Students will drag the hamza symbol (ء) to place it{" "}
          <strong>
            {correctPosition === "above"
              ? "above"
              : correctPosition === "below"
              ? "below"
              : "on the line of"}
          </strong>{" "}
          the letter{" "}
          <span className="text-3xl font-arabic">{getLetterDisplay()}</span> to
          create{" "}
          <span className="text-3xl font-arabic">
            {getResultLetter(targetLetter.letterId, correctPosition)}
          </span>
        </PreviewBox>
      )}
    </div>
  );
}
