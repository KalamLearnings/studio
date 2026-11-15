/**
 * Word-bank review endpoints on the `words` edge function (CM-S7). Staff only.
 */

import { fetchWithAuth } from '@/lib/api/client';
import type { QueueWord } from '@/lib/words/review/queue';

/** `GET /words`: every live word with its curation columns and link count. */
export async function listWordsForReview(): Promise<QueueWord[]> {
  return fetchWithAuth<QueueWord[]>('/words');
}

/** `PUT /words/:wordId/review`: records (or withdraws) the approval; the server stamps `reviewed_at` and `reviewed_by`. 409 `WORD_RETIRED` for a retired row. */
export async function setWordReviewed(wordId: string, reviewed: boolean): Promise<QueueWord> {
  return fetchWithAuth<QueueWord>(`/words/${encodeURIComponent(wordId)}/review`, {
    method: 'PUT',
    body: JSON.stringify({ reviewed }),
  });
}
