"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Checkbox as CheckboxUI } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FormField } from "../shared";
import {
  BLEND_ENDINGS,
  BLEND_STAGE_ORDER,
  ENDING_LABELS,
  STAGE_LABELS,
  type BlendEnding,
  type BlendStage,
} from "@/lib/soundBlend/config";

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

/** Per-activity settings: the ending form and the stages. */
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
      <FormField label="Ending" hint={ENDING_LABELS[ending].hint}>
        <div className="flex gap-3">
          {BLEND_ENDINGS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onEndingChange(value)}
              className={cn(
                "flex min-w-[120px] flex-col items-center gap-1 rounded-lg border-2 px-4 py-2 transition-all",
                ending === value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              )}
            >
              <span className="font-medium">{ENDING_LABELS[value].label}</span>
              <span className="font-arabic text-lg">{value === "pausal" ? "كِتَابْ" : "كِتَابٌ"}</span>
            </button>
          ))}
        </div>
        {endingWarning && (
          <p className="text-sm text-amber-700 dark:text-amber-400">{endingWarning}</p>
        )}
      </FormField>

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
