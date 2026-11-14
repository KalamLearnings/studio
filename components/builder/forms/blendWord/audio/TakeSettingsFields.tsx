"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { VOICES } from "@/lib/constants/voices";
import type { TakeSettingsDraft } from "@/lib/blendWord/takes";

interface TakeSettingsFieldsProps {
  draft: TakeSettingsDraft;
  errors?: Partial<Record<keyof TakeSettingsDraft, string>>;
  onChange: (draft: TakeSettingsDraft) => void;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      {children}
      {error && <span className="text-destructive">{error}</span>}
    </label>
  );
}

/** The settings a natural take is made with: voice, seed, voice settings. Blank keeps the default. */
export function TakeSettingsFields({ draft, errors = {}, onChange }: TakeSettingsFieldsProps) {
  const set = (patch: Partial<TakeSettingsDraft>) => onChange({ ...draft, ...patch });
  const known = VOICES.some((v) => v.id === draft.voiceId);
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <Field label="Voice" error={errors.voiceId}>
        <select
          value={draft.voiceId}
          onChange={(e) => set({ voiceId: e.target.value })}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          <option value="">Default Arabic voice</option>
          {!known && draft.voiceId && <option value={draft.voiceId}>{draft.voiceId}</option>}
          {VOICES.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Seed" error={errors.seed}>
        <Input inputMode="numeric" value={draft.seed} placeholder="Default" onChange={(e) => set({ seed: e.target.value })} />
      </Field>
      <Field label="Stability (0 to 1)" error={errors.stability}>
        <Input inputMode="decimal" value={draft.stability} placeholder="Default" onChange={(e) => set({ stability: e.target.value })} />
      </Field>
      <Field label="Similarity (0 to 1)" error={errors.similarityBoost}>
        <Input
          inputMode="decimal"
          value={draft.similarityBoost}
          placeholder="Default"
          onChange={(e) => set({ similarityBoost: e.target.value })}
        />
      </Field>
      <Field label="Style (0 to 1, keep 0)" error={errors.style}>
        <Input inputMode="decimal" value={draft.style} placeholder="Default" onChange={(e) => set({ style: e.target.value })} />
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-xs">
        <input
          type="checkbox"
          checked={draft.arabicLanguageCode}
          onChange={(e) => set({ arabicLanguageCode: e.target.checked })}
        />
        Tell the voice the text is Arabic
      </label>
    </div>
  );
}
