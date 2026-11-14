"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BLEND_ENDINGS, ENDING_LABELS, type BlendEnding } from "@/lib/blendWord/config";
import { savedWordLine, wordBlendForm } from "@/lib/blendWord/review";
import { audioErrorView, generateBody } from "@/lib/blendWord/takes";
import { useBlendAudioActions, useWordBlend } from "@/lib/hooks/useBlendReview";
import { FormAudioPanel } from "./FormAudioPanel";

interface WordAudioSectionProps {
  /** The saved library word. */
  wordId: string;
  ending: BlendEnding;
  /** The units of each form, to label the waveform when no split is stored for it. */
  unitsByForm: Record<BlendEnding, readonly { text: string }[]>;
}

/**
 * The word editor's audio (SB-S3): per form, the status of the natural and
 * stretched takes, play, Generate and Regenerate, review, and the marks. It
 * reads the saved word itself (`GET /words/:wordId/blend`), so every saved
 * word shows its real takes, waiting for review or not.
 */
export function WordAudioSection({ wordId, ending, unitsByForm }: WordAudioSectionProps) {
  const blend = useWordBlend(wordId);
  const actions = useBlendAudioActions();

  if (blend.isLoading) {
    return (
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading the audio status...
      </p>
    );
  }
  if (blend.error || !blend.data) {
    return <p className="text-sm text-destructive">The audio status could not be loaded: {audioErrorView(blend.error).message}</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{savedWordLine(blend.data)}</p>
      <div className="grid gap-3 md:grid-cols-2">
        {BLEND_ENDINGS.map((form) => {
          const reviewForm = wordBlendForm(blend.data, form);
          const units = reviewForm?.units ?? unitsByForm[form];
          return (
            <div key={form} className={cn("space-y-2 rounded-lg border p-3", ending === form && "border-primary/60")}>
              <p className="text-sm font-medium">{ENDING_LABELS[form].label} form</p>
              <FormAudioPanel
                takes={reviewForm?.takes ?? []}
                units={units}
                generationOff={actions.generationOff}
                onGenerate={(regenerate, settings) => actions.generate(wordId, generateBody(form, regenerate, settings))}
                onReviewTake={(takeId, body) => actions.reviewTake(wordId, takeId, body)}
                onSaveMarks={(takeId, marks) => actions.correctMarks(wordId, takeId, marks, units)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
