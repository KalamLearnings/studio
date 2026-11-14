"use client";

import * as React from "react";
import { FormField, TextInput, AudioPickerField } from "../shared";
import { useBlendWord } from "@/lib/hooks/useBlendWord";
import { ENDING_LABELS } from "@/lib/blendWord/config";
import {
  pickWord,
  wordSplitBlendWordEditor,
  type WordSplitBlendFormConfig,
} from "@/lib/wordSplitBlend/config";
import { chunkPreviewNotes, wordSplitBlendSaveErrorView } from "@/lib/wordSplitBlend/chunks";
import { BlendWordSection } from "../blendWord/BlendWordSection";
import { BlendEndingField } from "../blendWord/BlendEndingField";
import { WordSplitChunkPreview } from "./WordSplitChunkPreview";
import type { BaseActivityFormProps } from "../types";

/**
 * word_split_blend on the word model (`blendVersion: 2`, SB-B10). The word
 * editor is sound_blend's (lib/blendWord); there are no stages or speeds. The
 * chunks are the server's and are shown read-only.
 */
export function WordSplitBlendV2Form({
  config,
  onChange,
  topic,
  saveError,
}: BaseActivityFormProps<WordSplitBlendFormConfig>) {
  const cfg = React.useMemo<WordSplitBlendFormConfig>(() => config ?? {}, [config]);
  const blend = useBlendWord(cfg, { enabled: true, topic, saveError });
  const { preview, ending } = blend;
  const errors = wordSplitBlendSaveErrorView(blend.saveErrors, ending);
  const { tooShort, notes } = chunkPreviewNotes(preview?.[ending], ending);
  const editor = wordSplitBlendWordEditor;

  return (
    <div className="space-y-6">
      <BlendWordSection
        config={cfg}
        editor={editor}
        state={blend}
        onChange={onChange}
        onWordChange={(value, wordData) => onChange(pickWord(cfg, value, wordData))}
        generalErrors={errors.general}
      />

      <BlendEndingField
        ending={ending}
        warning={blend.endingWarning}
        error={errors.ending}
        onChange={(value) => onChange(editor.changeEnding(cfg, value))}
      />

      <FormField label="Chunks">
        <WordSplitChunkPreview
          units={preview?.[ending].units ?? []}
          formLabel={ENDING_LABELS[ending].label}
          notes={notes}
          tooShort={errors.ending ? null : tooShort}
          savedChunks={cfg.chunks ?? []}
        />
      </FormField>

      <AudioPickerField
        label="Full-word audio (optional)"
        value={cfg.wordAudioUrl}
        onChange={(audioUrl) => onChange({ ...cfg, wordAudioUrl: audioUrl })}
      />

      <div className="border-t pt-4 space-y-4">
        <h4 className="text-sm font-medium">Optional</h4>
        <FormField label="Transliteration" hint="e.g., 'madrasa'">
          <TextInput
            value={cfg.transliteration || ""}
            onChange={(value) => onChange({ ...cfg, transliteration: value || undefined })}
            placeholder="madrasa"
          />
        </FormField>
        <FormField label="English Meaning" hint="e.g., 'school'">
          <TextInput
            value={cfg.meaning || ""}
            onChange={(value) => onChange({ ...cfg, meaning: value || undefined })}
            placeholder="school"
          />
        </FormField>
      </div>
    </div>
  );
}
