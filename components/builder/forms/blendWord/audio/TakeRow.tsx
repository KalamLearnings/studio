"use client";

import * as React from "react";
import { Check, Loader2, X, AudioWaveform } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  KIND_LABELS,
  MAX_TAKE_ATTEMPTS,
  STATUS_LABELS,
  STATUS_TONES,
  takeActions,
  takeErrorText,
  type BlendReviewTake,
  type TakeReviewBody,
} from "@/lib/blendWord/takes";
import { VOICES } from "@/lib/constants/voices";
import { StatusPill } from "./TakeStatusChips";
import { PlayTakeButton } from "./PlayTakeButton";
import { TakeRejectForm } from "./TakeRejectForm";
import { WaveformMarkEditor } from "./WaveformMarkEditor";

type Result = { ok: boolean; message?: string; lines?: string[] };

interface TakeRowProps {
  take: BlendReviewTake;
  units: readonly { text: string }[];
  generationOff: string | null;
  onReview: (body: TakeReviewBody) => Promise<Result>;
  onSaveMarks: (marks: number[]) => Promise<Result>;
}

function voiceName(id: string | null): string | null {
  if (!id) return null;
  return VOICES.find((v) => v.id === id)?.name ?? id;
}

/** One take: play, approve, reject (and regenerate), and the mark editor. */
export function TakeRow({ take, units, generationOff, onReview, onSaveMarks }: TakeRowProps) {
  const actions = takeActions(take);
  const [rejecting, setRejecting] = React.useState(false);
  const [marksOpen, setMarksOpen] = React.useState(() => actions.editMarks && take.qaFlags.length > 0);
  const [approving, setApproving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const reason = takeErrorText(take.error);
  const voice = voiceName(take.voiceId);

  const approve = async () => {
    setError(null);
    setApproving(true);
    const res = await onReview({ decision: "approve" });
    setApproving(false);
    if (!res.ok) setError(res.message ?? "The take was not approved.");
  };

  return (
    <div className="space-y-2 rounded-md border p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{KIND_LABELS[take.kind]}</span>
          <StatusPill tone={STATUS_TONES[take.status]}>{STATUS_LABELS[take.status]}</StatusPill>
          <span className="text-xs text-muted-foreground">
            Attempt {take.attempts} of {MAX_TAKE_ATTEMPTS}
            {voice ? `, voice ${voice}` : ""}
            {take.durationMs ? `, ${Math.round(take.durationMs)} ms` : ""}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PlayTakeButton url={take.url} />
          {actions.editMarks && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setMarksOpen(!marksOpen)}>
              <AudioWaveform className="mr-1 h-3.5 w-3.5" /> {marksOpen ? "Hide marks" : "Marks"}
            </Button>
          )}
          {actions.approve && (
            <Button type="button" size="sm" onClick={approve} disabled={approving}>
              {approving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
              Approve
            </Button>
          )}
          {actions.reject && !rejecting && (
            <Button type="button" variant="outline" size="sm" onClick={() => setRejecting(true)}>
              <X className="mr-1 h-3.5 w-3.5" /> Reject
            </Button>
          )}
        </div>
      </div>
      {reason && (take.status === "failed" || take.status === "not_voiceable" || take.status === "rejected") && (
        <p className={take.status === "rejected" ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>{reason}</p>
      )}
      {take.status === "not_voiceable" && (
        <p className="text-xs text-muted-foreground">
          Every attempt failed. The word plays silently in the app. Try other settings, or use another word that teaches the same pattern.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {rejecting && (
        <TakeRejectForm
          take={take}
          generationOff={generationOff}
          onCancel={() => setRejecting(false)}
          onSubmit={async (body) => {
            const res = await onReview(body);
            if (res.ok) setRejecting(false);
            return res;
          }}
        />
      )}
      {marksOpen && actions.editMarks && <WaveformMarkEditor take={take} units={units} onSave={onSaveMarks} />}
    </div>
  );
}
