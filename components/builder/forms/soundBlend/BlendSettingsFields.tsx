"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Checkbox as CheckboxUI } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FormField } from "../shared";
import type { BlendEnding } from "@/lib/blendWord/config";
import { BLEND_STAGE_ORDER, STAGE_LABELS, type BlendStage } from "@/lib/soundBlend/config";
import { BlendEndingField } from "../blendWord/BlendEndingField";

interface BlendSettingsFieldsProps {
  ending: BlendEnding;
  stages: BlendStage[];
  /** Curriculum-order warning for the ending, if any. */
  endingWarning: string | null;
  /** Problems with a stored stage list (old or hand-edited data). */
  stageProblems: string[];
  onEndingChange: (ending: BlendEnding) => void;
  onStageToggle: (stage: BlendStage, on: boolean) => void;
}

/** sound_blend's per-activity settings: the ending form (shared) and the stages. */
export function BlendSettingsFields({
  ending,
  stages,
  endingWarning,
  stageProblems,
  onEndingChange,
  onStageToggle,
}: BlendSettingsFieldsProps) {
  return (
    <>
      <BlendEndingField ending={ending} warning={endingWarning} onChange={onEndingChange} />

      <FormField
        label="Stages"
        hint="The child slides the word at least twice: together (with the audio), then alone. Stages always run in this order."
      >
        <div className="space-y-2">
          {BLEND_STAGE_ORDER.map((stage, i) => {
            const meta = STAGE_LABELS[stage];
            const id = `blend-stage-${stage}`;
            return (
              <div key={stage} className="flex items-start gap-2">
                <CheckboxUI
                  id={id}
                  checked={meta.required || stages.includes(stage)}
                  disabled={meta.required}
                  onCheckedChange={(checked) => onStageToggle(stage, checked === true)}
                  className="mt-0.5"
                />
                <Label htmlFor={id} className={cn("text-sm", !meta.required && "cursor-pointer")}>
                  <span className="font-medium">
                    {i + 1}. {meta.label}
                  </span>
                  {meta.required && <span className="ml-1 text-xs text-muted-foreground">(always)</span>}
                  <span className="block text-xs font-normal text-muted-foreground">{meta.hint}</span>
                </Label>
              </div>
            );
          })}
        </div>
        {stageProblems.length > 0 && (
          <ul className="text-sm text-destructive">
            {stageProblems.map((p) => (
              <li key={p}>
                The saved stages are invalid: {p} Pick the stages again to fix them.
              </li>
            ))}
          </ul>
        )}
      </FormField>
    </>
  );
}
