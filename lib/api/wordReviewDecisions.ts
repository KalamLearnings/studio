/**
 * The word review page's pseudo / wrong decisions (`words` edge function), staff only.
 * Shared between reviewers; the backend records them and applies nothing.
 */

import { fetchWithAuth } from './client';
import type { NoteDecision, ReviewNote } from '@/lib/words/review/queue';

/** A stored decision as the backend returns it. */
interface ReviewDecisionRow {
  word_id: string;
  decision: NoteDecision;
  corrected_spelling: string | null;
  reviewed_by: string;
  created_at: string;
  updated_at: string;
}

const toNote = (r: ReviewDecisionRow): ReviewNote => ({
  wordId: r.word_id,
  decision: r.decision,
  ...(r.corrected_spelling ? { correctedSpelling: r.corrected_spelling } : {}),
});

/** `GET /words/review-decisions`. */
export async function listReviewDecisions(): Promise<ReviewNote[]> {
  return (await fetchWithAuth<ReviewDecisionRow[]>('/words/review-decisions')).map(toNote);
}

/** `PUT /words/:wordId/review-decision`: `wrong` needs the corrected spelling, `pseudo` takes none. */
export async function setReviewDecision(note: ReviewNote): Promise<ReviewNote> {
  const body =
    note.decision === 'wrong'
      ? { decision: note.decision, correctedSpelling: note.correctedSpelling }
      : { decision: note.decision };
  return toNote(
    await fetchWithAuth<ReviewDecisionRow>(`/words/${encodeURIComponent(note.wordId)}/review-decision`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  );
}

/** `DELETE /words/:wordId/review-decision`. */
export const clearReviewDecision = (wordId: string) =>
  fetchWithAuth<{ removed: boolean }>(`/words/${encodeURIComponent(wordId)}/review-decision`, {
    method: 'DELETE',
  });
