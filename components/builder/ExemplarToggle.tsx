"use client";

import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { useCurriculumLead } from "@/lib/hooks/useCurriculumLead";
import { useDraftActions } from "@/lib/hooks/useDrafts";
import { describeGenerationError } from "@/lib/generation/drafts";

interface Props {
  activityId: string;
  isExemplar: boolean;
  isAiDraft: boolean;
  isPublished: boolean;
}

/**
 * Curriculum lead only (CM-S9): marks a published, human-authored activity as an exemplar the
 * AI drafter may copy. An unapproved AI draft shows a pointer to the drafts queue instead.
 */
export function ExemplarToggle({ activityId, isExemplar, isAiDraft, isPublished }: Props) {
  const isLead = useCurriculumLead();
  const { exemplar } = useDraftActions();
  const [value, setValue] = React.useState(isExemplar);
  React.useEffect(() => setValue(isExemplar), [isExemplar]);

  if (isAiDraft) {
    return (
      <p className="border-b bg-muted/40 px-4 py-2 text-sm">
        This is an AI draft. A curriculum lead approves it in Draft review before it can be published.
      </p>
    );
  }
  if (!isLead) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b bg-muted/40 px-4 py-2 text-sm">
      <Switch
        checked={value}
        disabled={exemplar.isPending || (!value && !isPublished)}
        onCheckedChange={(next) =>
          exemplar.mutate(
            { id: activityId, value: next },
            { onSuccess: () => setValue(next) },
          )
        }
        aria-label="Exemplar"
      />
      <span>Exemplar for AI drafts{!isPublished && " (publish it first)"}</span>
      {exemplar.isError && <span className="text-destructive">{describeGenerationError(exemplar.error)}</span>}
    </div>
  );
}
