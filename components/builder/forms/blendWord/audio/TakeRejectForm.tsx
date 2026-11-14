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

interface TakeRejectFormProps {
  take: BlendReviewTake;
  /** Generation is switched off: regenerate is not offered, with this reason. */
  generationOff: string | null;
  onSubmit: (body: TakeReviewBody) => Promise<{ ok: boolean; message?: string }>;
  onCancel: () => void;
}

/**
 * Reject a take with a reason, and optionally regenerate it with the proposed
 * next settings, which the reviewer may edit first.
 */
export function TakeRejectForm({ take, generationOff, onSubmit, onCancel }: TakeRejectFormProps) {
  const [reason, setReason] = React.useState<TakeRejectReason | "">("");
  const [note, setNote] = React.useState("");
  const canRegenerate = take.kind === "natural" && !generationOff;
  const [regenerate, setRegenerate] = React.useState(false);
  const [draft, setDraft] = React.useState<TakeSettingsDraft>({ ...EMPTY_SETTINGS_DRAFT });
  const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<keyof TakeSettingsDraft, string>>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

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

  return (
    <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
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
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Note {reason === "other" ? "(needed)" : "(optional)"}</span>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} />
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
      {error && <p className="text-sm text-destructive">{error}</p>}
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
