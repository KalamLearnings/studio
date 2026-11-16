"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCw, SlidersHorizontal, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { approvePhraseTake, generatePhraseAudio, getPhraseAudio, rejectPhraseTake } from "@/lib/api/phraseReview";
import { EMPTY_SETTINGS_DRAFT, settingsFromDraft, type TakeSettingsDraft } from "@/lib/blendWord/takes";
import {
  audioSummary,
  currentTake,
  generateBody,
  GENERATION_OFF_TEXT,
  hasTakeInProgress,
  isGenerationOff,
  PHRASE_REJECT_LABELS,
  PHRASE_REJECT_REASONS,
  phraseAudioActions,
  phraseAudioErrorText,
  phraseRejectBody,
  takeToReject,
  takeToReview,
  TAKE_STATUS_LABELS,
  type PhraseAudioStatus,
} from "@/lib/phrases/phraseAudio";
import { PlayTakeButton } from "@/components/builder/forms/blendWord/audio/PlayTakeButton";
import { TakeSettingsFields } from "@/components/builder/forms/blendWord/audio/TakeSettingsFields";

const audioKey = (phraseKey: string) => ["reading-phrase-audio", phraseKey] as const;

function RejectForm({ status, onDone }: { status: PhraseAudioStatus; onDone: () => void }) {
  const qc = useQueryClient();
  const target = takeToReject(status);
  const [reason, setReason] = React.useState("");
  const [note, setNote] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const reject = useMutation({
    mutationFn: (body: { reason: (typeof PHRASE_REJECT_REASONS)[number]; note?: string }) => rejectPhraseTake(target!.id, body),
    onSettled: () => qc.invalidateQueries({ queryKey: audioKey(status.phrase_key) }),
    onSuccess: onDone,
  });
  if (!target) return null;

  const submit = () => {
    const parsed = phraseRejectBody(reason, note);
    if (!parsed.ok) return setFormError(parsed.error);
    setFormError(null);
    reject.mutate(parsed.body);
  };

  return (
    <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Reason</span>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="">Pick a reason</option>
          {PHRASE_REJECT_REASONS.map((r) => (
            <option key={r} value={r}>
              {PHRASE_REJECT_LABELS[r]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Note {reason === "other" ? "(needed)" : "(optional)"}</span>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} />
      </label>
      {(formError || reject.error) && (
        <p className="text-sm text-destructive">{formError ?? phraseAudioErrorText(reject.error)}</p>
      )}
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
  const query = useQuery({
    queryKey: audioKey(phraseKey),
    queryFn: () => getPhraseAudio(phraseKey),
    // A take is made in the background; look again until it is ready.
    refetchInterval: (q) => (q.state.data && hasTakeInProgress(q.state.data) ? 5000 : false),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: audioKey(phraseKey) });
  const [rejecting, setRejecting] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<TakeSettingsDraft>({ ...EMPTY_SETTINGS_DRAFT });
  const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<keyof TakeSettingsDraft, string>>>({});

  const approve = useMutation({ mutationFn: (id: string) => approvePhraseTake(id), onSettled: refresh });
  const generate = useMutation({
    mutationFn: (body: ReturnType<typeof generateBody>) => generatePhraseAudio(phraseKey, body),
    onSettled: refresh,
  });

  if (query.isLoading) {
    return (
      <p className="flex items-center text-xs text-muted-foreground">
        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Loading audio...
      </p>
    );
  }
  if (query.error || !query.data) {
    return <p className="text-xs text-destructive">Audio could not be loaded: {phraseAudioErrorText(query.error)}</p>;
  }

  const status = query.data;
  const actions = phraseAudioActions(status, canReview);
  const shown = currentTake(status);
  const review = takeToReview(status);
  const off = !status.generation_enabled || isGenerationOff(generate.error);
  const hasTakes = status.takes.some((t) => t.current);
  const busy = approve.isPending || generate.isPending;
  const error = [approve.error, generate.error].find((e) => e != null && !isGenerationOff(e));

  const go = () => {
    let settings = null;
    if (settingsOpen) {
      const parsed = settingsFromDraft(draft);
      if (!parsed.ok) return setFieldErrors(parsed.errors);
      setFieldErrors({});
      settings = parsed.request;
    }
    generate.mutate(generateBody(settings));
  };

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium">Phrase audio</span>
        {shown && <Badge variant={shown.status === "approved" ? "default" : "secondary"}>{TAKE_STATUS_LABELS[shown.status]}</Badge>}
        <span className="text-xs text-muted-foreground">{audioSummary(status)}</span>
      </div>
      {shown?.url && (
        <div className="flex flex-wrap items-center gap-2">
          <PlayTakeButton url={shown.url} label="Play" />
          {shown.duration_ms !== null && <span className="text-xs text-muted-foreground">{(shown.duration_ms / 1000).toFixed(1)} s</span>}
        </div>
      )}
      {shown?.error && (shown.status === "failed" || shown.status === "rejected") && (
        <p className="text-xs text-muted-foreground">{shown.error}</p>
      )}
      {review && review.id !== shown?.id && review.url && (
        <div className="flex flex-wrap items-center gap-2">
          <PlayTakeButton url={review.url} label="Play new take" />
          <span className="text-xs text-muted-foreground">Waiting for review</span>
        </div>
      )}
      {canReview && off && <p className="text-xs text-muted-foreground">{GENERATION_OFF_TEXT}</p>}
      {actions.approve || actions.reject || actions.generate ? (
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
          {actions.generate && (
            <>
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={go}>
                {generate.isPending ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : hasTakes ? (
                  <RotateCw className="mr-1 h-3.5 w-3.5" />
                ) : (
                  <Wand2 className="mr-1 h-3.5 w-3.5" />
                )}
                {hasTakes ? "Regenerate" : "Generate"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setSettingsOpen(!settingsOpen)}>
                <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />
                {settingsOpen ? "Use the defaults" : "Settings"}
              </Button>
            </>
          )}
        </div>
      ) : null}
      {actions.generate && settingsOpen && <TakeSettingsFields draft={draft} errors={fieldErrors} onChange={setDraft} />}
      {rejecting && <RejectForm status={status} onDone={() => setRejecting(false)} />}
      {generate.data && !generate.data.created && (
        <p className="text-xs text-muted-foreground">A recording was already waiting, so no new one was started.</p>
      )}
      {error != null && <p className="text-sm text-destructive">{phraseAudioErrorText(error)}</p>}
    </div>
  );
}
