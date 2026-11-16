"use client";

/**
 * The generate part: Generate (first take) or Regenerate, with optional
 * voice settings. `useGenerateTake` holds the state so a pane can start it
 * from the keyboard (`g`); `GenerateTakeControls` draws it. When recording is
 * switched off the server says so; that is shown calmly, never as an error.
 */

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCw, SlidersHorizontal, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TakeSettingsFields } from "@/components/builder/forms/blendWord/audio/TakeSettingsFields";
import { generatePhraseAudio } from "@/lib/api/phraseReview";
import { EMPTY_SETTINGS_DRAFT, settingsFromDraft, type TakeSettingsDraft } from "@/lib/blendWord/takes";
import { phraseAudioKey } from "@/lib/hooks/usePhraseAudio";
import { generateBody, isGenerationOff, phraseAudioErrorText } from "@/lib/phrases/phraseAudio";

export function useGenerateTake(phraseKey: string, onGenerated?: () => void) {
  const qc = useQueryClient();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<TakeSettingsDraft>({ ...EMPTY_SETTINGS_DRAFT });
  const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<keyof TakeSettingsDraft, string>>>({});
  const mutation = useMutation({
    mutationFn: (body: ReturnType<typeof generateBody>) => generatePhraseAudio(phraseKey, body),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: phraseAudioKey(phraseKey) });
      onGenerated?.();
    },
  });

  const go = () => {
    if (mutation.isPending) return;
    let settings = null;
    if (settingsOpen) {
      const parsed = settingsFromDraft(draft);
      if (!parsed.ok) return setFieldErrors(parsed.errors);
      setFieldErrors({});
      settings = parsed.request;
    }
    mutation.mutate(generateBody(settings));
  };

  return {
    go,
    pending: mutation.isPending,
    /** The server answered that recording is switched off. */
    off: isGenerationOff(mutation.error),
    /** A real refusal, in plain words (not "switched off"). */
    error: mutation.error != null && !isGenerationOff(mutation.error) ? phraseAudioErrorText(mutation.error) : null,
    /** A take was already waiting, so none was started. */
    alreadyWaiting: mutation.data ? !mutation.data.created : false,
    settingsOpen,
    toggleSettings: () => setSettingsOpen((o) => !o),
    draft,
    setDraft,
    fieldErrors,
  };
}

export type GenerateTakeState = ReturnType<typeof useGenerateTake>;

export function GenerateTakeControls({
  state,
  hasTakes,
  keyHint,
  size = "sm",
}: {
  state: GenerateTakeState;
  hasTakes: boolean;
  /** Shown after the button's label (Review shows `g`). */
  keyHint?: React.ReactNode;
  size?: "sm" | "default";
}) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size={size} variant="outline" disabled={state.pending} onClick={state.go}>
          {state.pending ? (
            <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : hasTakes ? (
            <RotateCw className="me-1 h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Wand2 className="me-1 h-3.5 w-3.5" aria-hidden="true" />
          )}
          {hasTakes ? "Regenerate" : "Generate"}
          {keyHint}
        </Button>
        <Button type="button" size={size} variant="ghost" onClick={state.toggleSettings} aria-expanded={state.settingsOpen}>
          <SlidersHorizontal className="me-1 h-3.5 w-3.5" aria-hidden="true" />
          {state.settingsOpen ? "Use the defaults" : "Settings"}
        </Button>
      </div>
      {state.settingsOpen && <TakeSettingsFields draft={state.draft} errors={state.fieldErrors} onChange={state.setDraft} />}
      {state.alreadyWaiting && <p className="text-xs text-muted-foreground">A recording was already waiting, so no new one was started.</p>}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </div>
  );
}
