"use client";

import * as React from "react";
import { FormField, WordSelector } from "../shared";
import type { Word } from "@/lib/hooks/useWords";
import type { BlendWordState } from "@/lib/hooks/useBlendWord";
import { ENDING_LABELS, type BlendWordConfig } from "@/lib/blendWord/config";
import type { WordEditor } from "@/lib/blendWord/editor";
import { BlendWordPanel } from "./BlendWordPanel";
import { HarakatSuggestionPanel } from "./HarakatSuggestionPanel";

interface BlendWordSectionProps<C extends BlendWordConfig> {
  config: C;
  /** The activity type's word editor (its config mapper). */
  editor: WordEditor<C>;
  state: BlendWordState;
  onChange: (config: C) => void;
  /** A word typed or picked from the library. */
  onWordChange: (value: string, wordData?: Word) => void;
  /** Errors not about one form's split, shown under the syllables. */
  generalErrors: string[];
}

/**
 * The word editor shared by the blend activities: the word (library pick or
 * typed), the harakat suggestion, both forms of the split with the override
 * and the practice-word flag, and the server's refusal of the last save.
 */
export function BlendWordSection<C extends BlendWordConfig>({
  config,
  editor,
  state,
  onChange,
  onWordChange,
  generalErrors,
}: BlendWordSectionProps<C>) {
  const { sourceText, wordEdit, preview, ending, saveErrors, harakat, harakatReason, showHarakat } = state;
  return (
    <>
      <WordSelector
        value={sourceText}
        onChange={onWordChange}
        label="Arabic Word"
        required
        placeholder="Type to search word library..."
      />

      {showHarakat && (
        <HarakatSuggestionPanel
          reason={harakatReason ?? "Ask for the word's harakat."}
          disabledReason={harakat.disabledReason}
          pending={harakat.pending}
          offer={harakat.offer}
          error={harakat.error}
          formLabel={ENDING_LABELS[ending].label}
          onSuggest={harakat.request}
          onConfirm={(text) => {
            onChange(editor.confirmHarakatSuggestion(config, text));
            harakat.dismiss();
          }}
          onDismiss={harakat.dismiss}
        />
      )}

      {preview && (
        <FormField
          label="Syllables"
          hint="Split by the shared rules, the same as the server. The server splits again on save."
        >
          <BlendWordPanel
            preview={preview}
            ending={ending}
            sourceText={sourceText}
            isPseudo={!!wordEdit?.isPseudo}
            serverIssues={saveErrors?.byForm}
            onUseFullForm={(text) => onChange(editor.changeWord(config, text))}
            onPseudoChange={(on) => onChange(editor.changePseudo(config, on))}
            onSplit={(form, i, at) => onChange(editor.splitFormUnit(config, form, i, at))}
            onMerge={(form, i) => onChange(editor.mergeFormUnits(config, form, i))}
            onReset={(form) => onChange(editor.changeOverride(config, form, null))}
          />
        </FormField>
      )}

      {generalErrors.length > 0 && (
        <ul className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">
          {generalErrors.map((m) => (
            <li key={m}>The server refused the save: {m}</li>
          ))}
        </ul>
      )}
    </>
  );
}
