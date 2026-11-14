"use client";

import * as React from "react";
import { anyPending, formStatusChips, latestTake, type BlendReviewTake, type TakeRequest, type TakeReviewBody } from "@/lib/blendWord/takes";
import { Loader2 } from "lucide-react";
import { TakeStatusChips } from "./TakeStatusChips";
import { TakeRow } from "./TakeRow";
import { GenerateAudioControls } from "./GenerateAudioControls";

type Result = { ok: boolean; message?: string; lines?: string[] };

interface FormAudioPanelProps {
  /** Newest first, as the backend lists them. */
  takes: BlendReviewTake[];
  units: readonly { text: string }[];
  generationOff: string | null;
  /** The word is not in the review queue: its takes are not listed, so show this instead of the chips. */
  notListed?: string | null;
  onGenerate: (regenerate: boolean, settings: TakeRequest | null) => Promise<Result>;
  onReviewTake: (takeId: string, body: TakeReviewBody) => Promise<Result>;
  onSaveMarks: (takeId: string, marks: number[]) => Promise<Result>;
}

/**
 * The audio of one ending form: the status chips, Generate and Regenerate,
 * and the current takes (older ones folded under "History").
 */
export function FormAudioPanel({ takes, units, generationOff, notListed, onGenerate, onReviewTake, onSaveMarks }: FormAudioPanelProps) {
  const current = takes.filter((t) => t.current && t.status !== "rejected");
  const history = takes.filter((t) => !current.includes(t));
  const row = (take: BlendReviewTake) => (
    <TakeRow
      key={take.id}
      take={take}
      units={units}
      generationOff={generationOff}
      onReview={(body) => onReviewTake(take.id, body)}
      onSaveMarks={(marks) => onSaveMarks(take.id, marks)}
    />
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Audio</span>
        {notListed ? (
          <span className="text-xs text-muted-foreground">{notListed}</span>
        ) : (
          <TakeStatusChips chips={formStatusChips(takes)} />
        )}
        {anyPending(takes) && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Being made; this updates by itself.
          </span>
        )}
      </div>
      <GenerateAudioControls
        hasTakes={takes.length > 0}
        lastNatural={latestTake(takes, "natural")}
        disabledReason={generationOff}
        onGenerate={onGenerate}
      />
      {current.map(row)}
      {history.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs text-muted-foreground">History ({history.length} older or rejected takes)</summary>
          <div className="mt-2 space-y-2">{history.map(row)}</div>
        </details>
      )}
    </div>
  );
}
