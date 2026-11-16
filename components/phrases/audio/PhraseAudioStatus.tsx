"use client";

/** One line on where a phrase's audio stands: the shown take's status and the plain summary. */

import { Badge } from "@/components/ui/badge";
import { audioSummary, currentTake, TAKE_STATUS_LABELS, type PhraseAudioStatus as Status } from "@/lib/phrases/phraseAudio";

export function PhraseAudioStatus({ status }: { status: Status }) {
  const shown = currentTake(status);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium">Phrase audio</span>
      {shown && <Badge variant={shown.status === "approved" ? "default" : "secondary"}>{TAKE_STATUS_LABELS[shown.status]}</Badge>}
      <span className="text-xs text-muted-foreground">{audioSummary(status)}</span>
    </div>
  );
}
