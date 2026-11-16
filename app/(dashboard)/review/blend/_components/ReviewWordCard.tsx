"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pseudoProposals, sortedForms, type BlendReviewWord } from "@/lib/blendWord/review";
import { generateBody } from "@/lib/blendWord/takes";
import type { BlendAudioActions } from "@/lib/hooks/useBlendReview";
import { PseudoProposals } from "@/components/review/lenses/blend/PseudoProposals";
import { ReviewFormPanel } from "@/components/review/lenses/blend/ReviewFormPanel";

/** One word of the queue: its library facts, pseudo-word proposals, and each form. */
export function ReviewWordCard({ item, actions }: { item: BlendReviewWord; actions: BlendAudioActions }) {
  const proposals = pseudoProposals(item);
  const forms = sortedForms(item);
  const id = item.wordId;
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-arabic text-3xl" dir="rtl">
              {item.word?.arabic ?? forms[0]?.vowelisedText ?? "?"}
            </span>
            <span className="text-sm text-muted-foreground">{item.word?.english || "No meaning in the library"}</span>
            {item.word?.isPseudo && <Badge variant="secondary">Practice word</Badge>}
            {!item.word && <Badge variant="destructive">Missing from the library</Badge>}
          </div>
          {item.word && (
            <span className="text-xs text-muted-foreground">
              Used by {item.word.usageCount} {item.word.usageCount === 1 ? "activity" : "activities"}
            </span>
          )}
        </div>

        <PseudoProposals proposals={proposals} />

        <div className="grid gap-4 lg:grid-cols-2">
          {forms.map((form) => (
            <ReviewFormPanel
              key={form.form}
              form={form}
              generationOff={actions.generationOff}
              onReviewSplit={(body) => actions.reviewSplit(id, form.form, body)}
              onGenerate={(regenerate, settings) => actions.generate(id, generateBody(form.form, regenerate, settings))}
              onReviewTake={(takeId, body) => actions.reviewTake(id, takeId, body)}
              onSaveMarks={(takeId, marks) => actions.correctMarks(id, takeId, marks, form.units)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
