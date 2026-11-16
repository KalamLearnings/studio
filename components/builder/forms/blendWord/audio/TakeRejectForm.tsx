"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  EMPTY_SETTINGS_DRAFT,
  REJECT_REASON_LABELS,
  TAKE_REJECT_REASONS,
  proposeRegenerate,
  settingsFromDraft,
  takeRejectBody,
  type BlendReviewTake,
  type TakeRejectReason,
  type TakeReviewBody,
  type TakeSettingsDraft,
} from "@/lib/blendWord/takes";
import { TakeSettingsFields } from "./TakeSettingsFields";

/** What the Review pane's keys drive (CW-6): a digit picks a reason, `enter` rejects. */
export interface TakeRejectHandle {
  submit: () => void;
  /** Picks the reason under key `n` (1 to 9, 0 for the tenth); false when no reason has that key. */
  pickReasonByKey: (n: number) => boolean;
}

/** The key that picks a reason in the numbered list: 1 to 9, 0 for the tenth, none after. */
export function reasonKey(index: number): string | null {
  return index < 9 ? String(index + 1) : index === 9 ? "0" : null;
}

interface TakeRejectFormProps {
  take: BlendReviewTake;
  /** Generation is switched off: regenerate is not offered, with this reason. */
  generationOff: string | null;
  onSubmit: (body: TakeReviewBody) => Promise<{ ok: boolean; message?: string }>;
  onCancel: () => void;
  /** Review pane: the reasons are numbered buttons the digit keys pick, and the pane drives the form. */
  handleRef?: React.Ref<TakeRejectHandle>;
}

/**
 * Reject a take with a reason, and optionally regenerate it with the proposed
 * next settings, which the reviewer may edit first.
 */
export function TakeRejectForm({ take, generationOff, onSubmit, onCancel, handleRef }: TakeRejectFormProps) {
  const [reason, setReason] = React.useState<TakeRejectReason | "">("");
  const [note, setNote] = React.useState("");
  const canRegenerate = take.kind === "natural" && !generationOff;
  const [regenerate, setRegenerate] = React.useState(false);
  const [draft, setDraft] = React.useState<TakeSettingsDraft>({ ...EMPTY_SETTINGS_DRAFT });
  const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<keyof TakeSettingsDraft, string>>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const noteRef = React.useRef<HTMLTextAreaElement>(null);

  const pickReason = (r: TakeRejectReason | "") => {
    setReason(r);
    if (r) setDraft(proposeRegenerate(take, r));
  };

  const submit = async () => {
    setError(null);
    let settings = null;
    if (regenerate && canRegenerate) {
      const parsed = settingsFromDraft(draft);
      if (!parsed.ok) {
        setFieldErrors(parsed.errors);
        return;
      }
      setFieldErrors({});
      settings = parsed.request;
    }
    const body = takeRejectBody(reason, note, settings);
    if (!body.ok) {
      setError(body.error);
      return;
    }
    setPending(true);
    const res = await onSubmit(body.body);
    setPending(false);
    if (!res.ok) setError(res.message ?? "The take was not rejected.");
  };

  React.useImperativeHandle(handleRef, () => ({
    submit: () => void submit(),
    pickReasonByKey: (n) => {
      const index = n === 0 ? 9 : n - 1;
      const r = TAKE_REJECT_REASONS[index];
      if (!r) return false;
      pickReason(r);
      setError(null);
      if (r === "other") noteRef.current?.focus();
      return true;
    },
  }));

  return (
    <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
      {handleRef ? (
        <fieldset className="flex flex-col gap-1 text-xs">
          <legend className="mb-1 text-muted-foreground">Reason (press its number)</legend>
          <div className="flex flex-wrap gap-1.5">
            {TAKE_REJECT_REASONS.map((r, i) => {
              const key = reasonKey(i);
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={reason === r}
                  onClick={() => pickReason(r)}
                  className={
                    reason === r
                      ? "inline-flex items-center gap-1.5 rounded-full border border-destructive bg-destructive/10 px-2.5 py-1 text-xs font-medium"
                      : "inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs hover:border-destructive/50"
                  }
                >
                  {key && (
                    <kbd className="inline-flex h-[16px] min-w-[16px] items-center justify-center rounded border border-b-2 px-1 font-mono text-[10px] text-muted-foreground">
                      {key}
                    </kbd>
                  )}
                  {REJECT_REASON_LABELS[r]}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : (
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Reason</span>
        <select
          value={reason}
          onChange={(e) => pickReason(e.target.value as TakeRejectReason | "")}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          <option value="">Pick a reason</option>
          {TAKE_REJECT_REASONS.map((r) => (
            <option key={r} value={r}>
              {REJECT_REASON_LABELS[r]}
            </option>
          ))}
        </select>
      </label>
      )}
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Note {reason === "other" ? "(needed)" : "(optional)"}</span>
        <Textarea ref={noteRef} value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} />
      </label>
      {take.kind === "natural" && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={regenerate && canRegenerate}
              disabled={!canRegenerate}
              onChange={(e) => setRegenerate(e.target.checked)}
            />
            Make a new take after rejecting
            {generationOff && <span className="text-xs text-muted-foreground">({generationOff})</span>}
          </label>
          {regenerate && canRegenerate && (
            <>
              <p className="text-xs text-muted-foreground">
                Proposed from the reason. Change them if you want; blank fields use the default.
              </p>
              <TakeSettingsFields draft={draft} errors={fieldErrors} onChange={setDraft} />
            </>
          )}
        </div>
      )}
      {take.kind === "stretched" && (
        <p className="text-xs text-muted-foreground">
          A stretched take is made again from its natural take. To change the voice, reject the natural take.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="button" variant="destructive" size="sm" onClick={submit} disabled={pending}>
          {pending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
          Reject take
        </Button>
      </div>
    </div>
  );
}
