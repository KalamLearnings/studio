/**
 * The blend review queue and the word-audio actions (SB-S3, SB-S4). Glue
 * only: the shapes and the plain-word messages live in lib/blendWord/takes.ts,
 * review.ts and marks.ts.
 *
 * Every action answers with an `ActionResult`, so a component shows the
 * refusal where the reviewer acted. After a write the queue is read again
 * (the backend's answers carry no playable URLs).
 */

import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  correctTakeMarks,
  generateWordAudio,
  listBlendReview,
  reviewTake,
  reviewWordBlend,
  runBlendAiCheck,
} from '@/lib/api/words';
import type { BlendEnding } from '@/lib/blendWord/config';
import { anyPending, audioErrorView, type GenerateAudioInput, type TakeReviewBody } from '@/lib/blendWord/takes';
import { marksErrorLines } from '@/lib/blendWord/marks';
import {
  aiCheckErrorView,
  aiCheckSummary,
  type BlendReviewList,
  type SplitReviewBody,
} from '@/lib/blendWord/review';

export const BLEND_REVIEW_KEY = ['blend-review'] as const;

/** How often the queue is read again while a take is being made. */
const POLL_MS = 10_000;

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string; lines?: string[] };

function hasPending(list: BlendReviewList | undefined): boolean {
  return !!list?.items?.some((w) => w.forms.some((f) => anyPending(f.takes)));
}

export function useBlendReviewQueue(enabled = true) {
  return useQuery({
    queryKey: BLEND_REVIEW_KEY,
    queryFn: () => listBlendReview(200),
    enabled,
    refetchInterval: (query) => (hasPending(query.state.data) ? POLL_MS : false),
  });
}

export interface BlendAudioActions {
  /** Set once the backend says generation is switched off or out of budget: the buttons stay disabled. */
  generationOff: string | null;
  generate: (wordId: string, body: GenerateAudioInput) => Promise<ActionResult>;
  reviewTake: (wordId: string, takeId: string, body: TakeReviewBody) => Promise<ActionResult>;
  correctMarks: (wordId: string, takeId: string, marks: number[], units?: readonly { text: string }[]) => Promise<ActionResult>;
  reviewSplit: (wordId: string, form: BlendEnding, body: SplitReviewBody) => Promise<ActionResult>;
}

export function useBlendAudioActions(): BlendAudioActions {
  const queryClient = useQueryClient();
  const [generationOff, setGenerationOff] = useState<string | null>(null);

  const run = useCallback(
    async (call: () => Promise<unknown>, onError?: (e: unknown) => ActionResult | null): Promise<ActionResult> => {
      try {
        await call();
        await queryClient.invalidateQueries({ queryKey: BLEND_REVIEW_KEY });
        return { ok: true };
      } catch (e) {
        const special = onError?.(e);
        if (special) return special;
        const view = audioErrorView(e);
        if (view.disableGeneration) setGenerationOff(view.message);
        return { ok: false, message: view.message };
      }
    },
    [queryClient],
  );

  return {
    generationOff,
    generate: useCallback((wordId, body) => run(() => generateWordAudio(wordId, body)), [run]),
    reviewTake: useCallback((wordId, takeId, body) => run(() => reviewTake(wordId, takeId, body)), [run]),
    correctMarks: useCallback(
      (wordId, takeId, marks, units) =>
        run(
          () => correctTakeMarks(wordId, takeId, marks),
          (e) => {
            const lines = marksErrorLines(e as { code?: string; details?: unknown; message?: string }, units);
            return lines ? { ok: false, message: 'The marks were not saved:', lines } : null;
          },
        ),
      [run],
    ),
    reviewSplit: useCallback((wordId, form, body) => run(() => reviewWordBlend(wordId, form, body)), [run]),
  };
}

/** The batch AI check; a 503 keeps the button disabled with the reason. */
export function useBlendAiCheck() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [disabledReason, setDisabledReason] = useState<string | null>(null);

  const check = useCallback(
    async (wordIds: string[]) => {
      setPending(true);
      setResult(null);
      try {
        const res = await runBlendAiCheck(wordIds);
        setResult({ ok: true, message: aiCheckSummary(res) });
        await queryClient.invalidateQueries({ queryKey: BLEND_REVIEW_KEY });
      } catch (e) {
        const view = aiCheckErrorView(e);
        if (view.disable) setDisabledReason(view.message);
        setResult({ ok: false, message: view.message });
      } finally {
        setPending(false);
      }
    },
    [queryClient],
  );

  return { check, pending, result, disabledReason };
}
