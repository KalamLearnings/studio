"use client";

import * as React from "react";
import { Check, Loader2, X, AudioWaveform } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import { PlayTakeButton, type PlayTakeHandle } from "./PlayTakeButton";
import { TakeRejectForm, type TakeRejectHandle } from "./TakeRejectForm";
import { WaveformMarkEditor } from "./WaveformMarkEditor";

type Result = { ok: boolean; message?: string; lines?: string[] };

/** What the Review pane's keys drive (CW-6). */
export interface TakeRowHandle {
  approve: () => void;
  /** Opens the reject form; false when this take cannot be rejected. */
  startReject: () => boolean;
  /** Closes the reject form; false when it was not open. */
  cancelReject: () => boolean;
  submitReject: () => void;
  pickReasonByKey: (n: number) => boolean;
  play: () => void;
}

/** The Review pane's extras: its keys drive the row, and the row it focuses is outlined. */
export interface TakeRowReviewProps {
  handleRef?: React.Ref<TakeRowHandle>;
  focused?: boolean;
  onRejectingChange?: (open: boolean) => void;
}

interface TakeRowProps extends TakeRowReviewProps {
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
export function TakeRow({ take, units, generationOff, onReview, onSaveMarks, handleRef, focused, onRejectingChange }: TakeRowProps) {
  const actions = takeActions(take);
  const [rejecting, setRejectingState] = React.useState(false);
  const setRejecting = (open: boolean) => {
    setRejectingState(open);
    onRejectingChange?.(open);
  };
  const rootRef = React.useRef<HTMLDivElement>(null);
  const playRef = React.useRef<PlayTakeHandle>(null);
  const rejectRef = React.useRef<TakeRejectHandle>(null);
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

  React.useImperativeHandle(handleRef, () => ({
    approve: () => {
      if (actions.approve) void approve();
      else setError("This take has no audio or marks yet, so it cannot be approved.");
    },
    startReject: () => {
      if (!actions.reject) return false;
      setRejecting(true);
      return true;
    },
    cancelReject: () => {
      if (!rejecting) return false;
      setRejecting(false);
      return true;
    },
    submitReject: () => rejectRef.current?.submit(),
    pickReasonByKey: (n) => rejectRef.current?.pickReasonByKey(n) ?? false,
    play: () => playRef.current?.toggle(),
  }));

  React.useEffect(() => {
    if (focused) rootRef.current?.scrollIntoView({ block: "nearest" });
  }, [focused]);

  return (
    <div
      ref={rootRef}
      data-take-id={take.id}
      aria-current={focused ? "true" : undefined}
      className={cn("space-y-2 rounded-md border p-2", focused && "border-primary ring-2 ring-primary/30")}
    >
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
          <PlayTakeButton url={take.url} handleRef={playRef} />
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
          handleRef={handleRef ? rejectRef : undefined}
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
