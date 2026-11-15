/** Phrase review and live phrase decodability on the `curriculum` edge function (CM-S11). */

import { fetchWithAuth } from './client';
import { approvalBody, type DraftPhraseDecodability, type PhraseEntry, type PhraseList } from '@/lib/phrases/phraseReview';

const BASE = '/curriculum/reading/phrases';

export const listPhrases = () => fetchWithAuth<PhraseList>(BASE);

export const approvePhrase = (entry: Pick<PhraseEntry, 'word_ids' | 'is_sentence'>) =>
  fetchWithAuth<PhraseEntry>(`${BASE}/approvals`, { method: 'POST', body: JSON.stringify(approvalBody(entry)) });

/** The key is the ids joined by one space; the space is URL-encoded. */
export const revokePhrase = (phraseKey: string) =>
  fetchWithAuth<unknown>(`${BASE}/approvals/${encodeURIComponent(phraseKey)}`, { method: 'DELETE' });

export const checkDraftPhrase = (body: { node_id: string; word_ids: string[]; is_sentence: boolean }) =>
  fetchWithAuth<DraftPhraseDecodability>(`${BASE}/decodability`, { method: 'POST', body: JSON.stringify(body) });
