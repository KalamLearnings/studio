"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FormField } from "../shared";
import { BLEND_ENDINGS, ENDING_LABELS, type BlendEnding } from "@/lib/blendWord/config";

interface BlendEndingFieldProps {
  ending: BlendEnding;
  /** Curriculum-order warning for the ending, if any. */
  warning: string | null;
  /** The server refused the save because of the ending (BLEND_INVALID on `config.ending`). */
  error?: string | null;
  onChange: (ending: BlendEnding) => void;
}

/** The activity's ending form (pausal or full), shared by the blend activities. */
export function BlendEndingField({ ending, warning, error, onChange }: BlendEndingFieldProps) {
  return (
    <FormField label="Ending" hint={ENDING_LABELS[ending].hint}>
      <div className="flex gap-3">
        {BLEND_ENDINGS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
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
      {warning && <p className="text-sm text-amber-700 dark:text-amber-400">{warning}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </FormField>
  );
}
