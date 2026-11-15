/**
 * The word-bank review queue (CM-S7): reads the bank, builds the queue, and
 * approves or withdraws a spelling. Every action answers with an
 * `{ ok, message }` so the row shows the refusal where the reviewer acted.
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/client';
import { listWordsForReview, setWordReviewed } from '@/lib/api/wordReview';
import { buildReviewQueue, type QueueWord } from '@/lib/words/review/queue';

export const WORD_REVIEW_KEY = ['word-review-queue'] as const;

export type ReviewResult = { ok: true } | { ok: false; message: string };

export function describeReviewError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'WORD_RETIRED') return 'This word is retired, so it cannot be approved.';
    if (e.status === 403) return 'Only staff can review words.';
    return e.message;
  }
  return e instanceof Error ? e.message : 'The request failed.';
}

export function useWordReviewQueue() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: WORD_REVIEW_KEY, queryFn: listWordsForReview, staleTime: 60_000 });
  const rows = useMemo(() => buildReviewQueue(query.data ?? []), [query.data]);

  const setReviewed = useCallback(
    async (wordId: string, reviewed: boolean): Promise<ReviewResult> => {
      try {
        const word = await setWordReviewed(wordId, reviewed);
        // Patch the cached row with the server's stamp so the queue keeps its place.
        queryClient.setQueryData<QueueWord[]>(WORD_REVIEW_KEY, (old) =>
          old?.map((w) => (w.id === wordId ? { ...w, ...word } : w)),
        );
        return { ok: true };
      } catch (e) {
        return { ok: false, message: describeReviewError(e) };
      }
    },
    [queryClient],
  );

  return { query, rows, setReviewed };
}
