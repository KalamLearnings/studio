"use client";

/**
 * The contrast picker for distractors (content model CM-S3, design 3.2): one
 * choice per distractor the server cannot derive a contrast for (what it
 * differs from the target by). Shown only for a graded type whose write
 * schema stores a picked contrast (`contrastPickerEnabled`).
 */

import * as React from "react";
import { useLetters, getLetterDisplayChar } from "@/lib/hooks/useLetters";
import {
  CONTRAST_CHOICES,
  contrastPickerEnabled,
  distractorsNeedingContrast,
  isContrastId,
} from "@/lib/activityConfig/contrast";
import { FormField, Select } from "./FormField";
import type { LetterReference } from "../types";
import { useBackendCapabilities } from "@/lib/backend/useBackendCapabilities";

type Distractor = LetterReference & { contrast?: string };

export function DistractorContrastField({
  activityType,
  targets,
  distractors,
  onChange,
  errorPath = "distractorLetters",
}: {
  activityType?: string;
  targets: LetterReference[];
  distractors: Distractor[];
  onChange: (distractors: Distractor[]) => void;
  errorPath?: string;
}) {
  const { getLetter } = useLetters();
  // PROD's backend stores no picked contrast (lib/backend/capabilities.ts).
  const { distractorContrast } = useBackendCapabilities();
  if (!distractorContrast || !contrastPickerEnabled(activityType)) return null;
  const need = distractorsNeedingContrast(targets, distractors);
  if (need.length === 0) return null;

  const pick = (index: number, contrast: string) =>
    onChange(distractors.map((d, i) => (i === index ? { ...d, contrast } : d)));

  return (
    <FormField
      label="Distractor Contrast"
      hint="What each of these distractors differs from the target by. The others are worked out on save."
      required
      errorPath={errorPath}
    >
      <div className="space-y-2">
        {need.map((i) => {
          const d = distractors[i]!;
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="w-10 text-center font-arabic text-2xl">
                {getLetterDisplayChar(d, getLetter)}
              </span>
              <div className="flex-1">
                <Select
                  value={isContrastId(d.contrast) ? d.contrast : ""}
                  onChange={(v) => pick(i, v)}
                  options={CONTRAST_CHOICES}
                  placeholder="Differs by..."
                />
              </div>
            </div>
          );
        })}
      </div>
    </FormField>
  );
}
