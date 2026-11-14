/**
 * The word editor's "Suggest harakat" request (SB-S2). Glue only: the shapes,
 * messages live in lib/blendWord/harakat.ts, the Confirm edit in lib/blendWord/editor.ts.
 */

import { useCallback, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { suggestHarakat } from '@/lib/api/words';
import type { BlendEnding } from '@/lib/blendWord/config';
import {
  harakatErrorView,
  offerMatchesWord,
  toHarakatOffer,
  type HarakatErrorView,
  type HarakatOffer,
} from '@/lib/blendWord/harakat';

export interface HarakatSuggestionState {
  /** The offer for the word in the editor; null once the author retypes it. */
  offer: HarakatOffer | null;
  error: HarakatErrorView | null;
  pending: boolean;
  /** Set after the switch-off or budget refusal: the action stays disabled. */
  disabledReason: string | null;
  request: () => void;
  /** Closes the offer or the error; the word is unchanged. */
  dismiss: () => void;
}

export function useHarakatSuggestion(sourceText: string, ending: BlendEnding): HarakatSuggestionState {
  const [disabledReason, setDisabledReason] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (text: string) => suggestHarakat(text),
    onError: (error) => {
      const view = harakatErrorView(error);
      if (view.disable) setDisabledReason(view.message);
    },
  });

  const requestedText = mutation.variables ?? '';
  const offer = useMemo(() => {
    const o = mutation.data ? toHarakatOffer(mutation.data, requestedText, ending) : null;
    return offerMatchesWord(o, sourceText) ? o : null;
  }, [mutation.data, requestedText, ending, sourceText]);

  const error = mutation.error && requestedText === sourceText ? harakatErrorView(mutation.error) : null;
  const { mutate, reset } = mutation;

  const request = useCallback(() => {
    if (sourceText.trim()) mutate(sourceText);
  }, [mutate, sourceText]);

  return {
    offer,
    error,
    pending: mutation.isPending,
    disabledReason,
    request,
    dismiss: reset,
  };
}
