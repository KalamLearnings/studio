/**
 * The word editor's derived state, shared by the blend forms (sound_blend,
 * word_split_blend). Glue only: every rule lives in the pure modules of
 * lib/blendWord.
 */

import { useMemo } from 'react';
import { useTopics } from '@/lib/hooks/useTopics';
import { useHarakatSuggestion, type HarakatSuggestionState } from '@/lib/hooks/useHarakatSuggestion';
import { sourceWordText, wordEditOf, type BlendEnding, type BlendWordConfig, type WordBlendEdit } from '@/lib/blendWord/config';
import { currentEnding } from '@/lib/blendWord/editor';
import { buildWordPreview, hasTanween, type WordPreview } from '@/lib/blendWord/preview';
import { getEndingOrderWarning } from '@/lib/blendWord/ending';
import { parseBlendSaveError, type BlendSaveErrors } from '@/lib/blendWord/saveErrors';
import { harakatSuggestionReason } from '@/lib/blendWord/harakat';
import { parseWordSpellingError } from '@/lib/words/spelling';

export interface BlendWordState {
  sourceText: string;
  wordEdit: WordBlendEdit | undefined;
  /** Both forms of the word; null with no word, or when the word model is off. */
  preview: WordPreview | null;
  ending: BlendEnding;
  endingWarning: string | null;
  saveErrors: BlendSaveErrors | null;
  /** The server refused the word itself (WORD_SPELLING_INVALID), as plain lines for the word field. */
  spellingErrors: string[] | null;
  harakatReason: string | null;
  harakat: HarakatSuggestionState;
  /** The harakat panel has something to show. */
  showHarakat: boolean;
}

export function useBlendWord(
  config: BlendWordConfig,
  options: {
    /** False when the form edits no word (sound_blend's letter mode). */
    enabled: boolean;
    topic: { id: string; curriculum_id?: string; sequence_number?: number } | null | undefined;
    saveError: { code?: string; details?: unknown } | null | undefined;
  },
): BlendWordState {
  const { enabled, topic, saveError } = options;
  const { data: topics } = useTopics(topic?.curriculum_id ?? null);
  const sourceText = sourceWordText(config);
  const wordEdit = wordEditOf(config);

  const preview = useMemo(
    () => (enabled && sourceText ? buildWordPreview(sourceText, wordEdit) : null),
    [enabled, sourceText, wordEdit],
  );
  const ending = currentEnding(config);
  const endingWarning = useMemo(
    () => (preview ? getEndingOrderWarning({ ending, topic, topics, wordHasTanween: hasTanween(preview) }) : null),
    [preview, ending, topic, topics],
  );
  const saveErrors = useMemo(() => parseBlendSaveError(saveError), [saveError]);
  const spellingErrors = useMemo(() => parseWordSpellingError(saveError)?.messages ?? null, [saveError]);

  // Harakat suggestion (SB-S2): offered for missing marks, or a pausal-only
  // word in a full-ending activity. Nothing changes until Confirm.
  const harakatReason = harakatSuggestionReason(preview, ending);
  const harakat = useHarakatSuggestion(sourceText, ending);
  const showHarakat = !!(harakatReason || harakat.offer || harakat.error || harakat.pending);

  return { sourceText, wordEdit, preview, ending, endingWarning, saveErrors, spellingErrors, harakatReason, harakat, showHarakat };
}
