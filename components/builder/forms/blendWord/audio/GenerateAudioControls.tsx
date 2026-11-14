"use client";

import * as React from "react";
import { Loader2, Wand2, RotateCw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  draftFromTake,
  settingsFromDraft,
  type BlendReviewTake,
  type TakeRequest,
  type TakeSettingsDraft,
} from "@/lib/blendWord/takes";
import { TakeSettingsFields } from "./TakeSettingsFields";

interface GenerateAudioControlsProps {
  /** The form already has takes: offer Regenerate beside Generate. */
  hasTakes: boolean;
  /** The newest natural take, whose settings the editable fields start from. */
  lastNatural: BlendReviewTake | null;
  /** Generation is switched off: the buttons are disabled with this reason. */
  disabledReason: string | null;
  onGenerate: (regenerate: boolean, settings: TakeRequest | null) => Promise<{ ok: boolean; message?: string }>;
}

/**
 * Generate (only the missing takes) and Regenerate (new takes; the open ones
 * are rejected), with editable settings. The scheduled worker makes the takes.
 */
export function GenerateAudioControls({ hasTakes, lastNatural, disabledReason, onGenerate }: GenerateAudioControlsProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<TakeSettingsDraft>(() => draftFromTake(lastNatural));
  const [errors, setErrors] = React.useState<Partial<Record<keyof TakeSettingsDraft, string>>>({});
  const [pending, setPending] = React.useState<null | "generate" | "regenerate">(null);
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);

  const go = async (regenerate: boolean) => {
    setMessage(null);
    let settings: TakeRequest | null = null;
    if (open) {
      const parsed = settingsFromDraft(draft);
      if (!parsed.ok) {
        setErrors(parsed.errors);
        return;
      }
      setErrors({});
      settings = parsed.request;
    }
    setPending(regenerate ? "regenerate" : "generate");
    const res = await onGenerate(regenerate, settings);
    setPending(null);
    setMessage(
      res.ok
        ? { ok: true, text: "Queued. The takes are made in the background; this list updates by itself." }
        : { ok: false, text: res.message ?? "The takes were not queued." }
    );
  };

  const disabled = !!disabledReason || pending !== null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={disabled} title={disabledReason ?? undefined} onClick={() => go(false)}>
          {pending === "generate" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Wand2 className="mr-1 h-3.5 w-3.5" />}
          Generate
        </Button>
        {hasTakes && (
          <Button type="button" size="sm" variant="outline" disabled={disabled} title={disabledReason ?? undefined} onClick={() => go(true)}>
            {pending === "regenerate" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RotateCw className="mr-1 h-3.5 w-3.5" />}
            Regenerate
          </Button>
        )}
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(!open)} disabled={!!disabledReason}>
          <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />
          {open ? "Use the defaults" : "Settings"}
        </Button>
        {disabledReason && <span className="text-xs text-muted-foreground">{disabledReason}</span>}
      </div>
      {open && !disabledReason && <TakeSettingsFields draft={draft} errors={errors} onChange={setDraft} />}
      {message && <p className={message.ok ? "text-xs text-muted-foreground" : "text-sm text-destructive"}>{message.text}</p>}
    </div>
  );
}
