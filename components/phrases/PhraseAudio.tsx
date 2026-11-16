"use client";

/**
 * The whole-phrase audio of one approved phrase on the old phrase page
 * (CM-S14), composed from the parts Review's Recordings pane also uses:
 * status, player, take review and generate (`./audio`).
 */

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approvePhraseTake, rejectPhraseTake } from "@/lib/api/phraseReview";
import { phraseAudioKey, usePhraseAudio } from "@/lib/hooks/usePhraseAudio";
import {
  currentTake,
  GENERATION_OFF_TEXT,
  phraseAudioActions,
  phraseAudioErrorText,
  phraseRejectBody,
  takeToReject,
  takeToReview,
  type PhraseAudioStatus as Status,
  type PhraseRejectReason,
} from "@/lib/phrases/phraseAudio";
import { GenerateTakeControls, useGenerateTake } from "./audio/GenerateTake";
import { PhraseAudioStatus } from "./audio/PhraseAudioStatus";
import { TakePlayer } from "./audio/TakePlayer";
import { EMPTY_TAKE_REVIEW, TakeReviewForm, type TakeReviewDraft } from "./audio/TakeReviewForm";
import { useTakeAudio } from "./audio/useTakeAudio";

function RejectForm({ status, onDone }: { status: Status; onDone: () => void }) {
  const qc = useQueryClient();
  const target = takeToReject(status);
  const [draft, setDraft] = React.useState<TakeReviewDraft>(EMPTY_TAKE_REVIEW);
  const reject = useMutation({
    mutationFn: (body: { reason: PhraseRejectReason; note?: string }) => rejectPhraseTake(target!.id, body),
    onSettled: () => qc.invalidateQueries({ queryKey: phraseAudioKey(status.phrase_key) }),
    onSuccess: onDone,
  });
  if (!target) return null;

  const submit = () => {
    const parsed = phraseRejectBody(draft.reason ?? "", draft.note);
    if (!parsed.ok) return setDraft({ ...draft, error: parsed.error });
    reject.mutate(parsed.body);
  };

  return (
    <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
      <TakeReviewForm draft={reject.error ? { ...draft, error: draft.error ?? phraseAudioErrorText(reject.error) } : draft} onChange={setDraft} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={reject.isPending}>
          Cancel
        </Button>
        <Button type="button" variant="destructive" size="sm" onClick={submit} disabled={reject.isPending}>
          {reject.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
          Reject take
        </Button>
      </div>
    </div>
  );
}

/** The whole-phrase audio of one approved phrase: status, player, review and generation (CM-S14). */
export function PhraseAudio({ phraseKey, canReview }: { phraseKey: string; canReview: boolean }) {
  const qc = useQueryClient();
  const query = usePhraseAudio(phraseKey);
  const refresh = () => qc.invalidateQueries({ queryKey: phraseAudioKey(phraseKey) });
  const [rejecting, setRejecting] = React.useState(false);
  const approve = useMutation({ mutationFn: (id: string) => approvePhraseTake(id), onSettled: refresh });
  const generate = useGenerateTake(phraseKey);
  const status = query.data;
  const shown = status ? currentTake(status) : null;
  const review = status ? takeToReview(status) : null;
  const shownAudio = useTakeAudio(shown?.url ?? null);
  const reviewAudio = useTakeAudio(review?.url ?? null);

  if (query.isLoading) {
    return (
      <p className="flex items-center text-xs text-muted-foreground">
        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Loading audio...
      </p>
    );
  }
  if (query.error || !status) {
    return <p className="text-xs text-destructive">Audio could not be loaded: {phraseAudioErrorText(query.error)}</p>;
  }

  const actions = phraseAudioActions(status, canReview);
  const off = !status.generation_enabled || generate.off;
  const hasTakes = status.takes.some((t) => t.current);
  const busy = approve.isPending || generate.pending;

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <PhraseAudioStatus status={status} />
      {shown?.url && <TakePlayer audio={shownAudio} durationMs={shown.duration_ms} label="the take" className="max-w-md" />}
      {shown?.error && (shown.status === "failed" || shown.status === "rejected") && (
        <p className="text-xs text-muted-foreground">{shown.error}</p>
      )}
      {review && review.id !== shown?.id && review.url && (
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">New take, waiting for review</span>
          <TakePlayer audio={reviewAudio} durationMs={review.duration_ms} label="the new take" className="max-w-md" />
        </div>
      )}
      {canReview && off && <p className="text-xs text-muted-foreground">{GENERATION_OFF_TEXT}</p>}
      {(actions.approve || actions.reject) && (
        <div className="flex flex-wrap items-center gap-2">
          {actions.approve && review && (
            <Button type="button" size="sm" disabled={busy} onClick={() => approve.mutate(review.id)}>
              {approve.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Approve take
            </Button>
          )}
          {actions.reject && !rejecting && (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setRejecting(true)}>
              Reject
            </Button>
          )}
        </div>
      )}
      {actions.generate && !off && <GenerateTakeControls state={generate} hasTakes={hasTakes} />}
      {rejecting && <RejectForm status={status} onDone={() => setRejecting(false)} />}
      {approve.error != null && <p className="text-sm text-destructive">{phraseAudioErrorText(approve.error)}</p>}
    </div>
  );
}
