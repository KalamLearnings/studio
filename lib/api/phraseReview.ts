/** Phrase review and live phrase decodability on the `curriculum` edge function (CM-S11). */

import { fetchWithAuth } from './client';
import { phraseAudioKeyPath, type GeneratePhraseAudioResult, type PhraseAudioStatus, type PhraseRejectReason } from '@/lib/phrases/phraseAudio';
import type { TakeRequest } from '@/lib/blendWord/takes';
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

// Whole-phrase audio (CM-S14). The key is the word ids joined by one space.
export const getPhraseAudio = (phraseKey: string) =>
  fetchWithAuth<PhraseAudioStatus>(`${BASE}/${phraseAudioKeyPath(phraseKey)}/audio`);

export const generatePhraseAudio = (phraseKey: string, body: { settings?: TakeRequest }) =>
  fetchWithAuth<GeneratePhraseAudioResult>(`${BASE}/${phraseAudioKeyPath(phraseKey)}/audio`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

const TAKE_BASE = '/curriculum/reading/phrase-audio';

export const approvePhraseTake = (takeId: string) =>
  fetchWithAuth<unknown>(`${TAKE_BASE}/${encodeURIComponent(takeId)}/approve`, { method: 'POST' });

export const rejectPhraseTake = (takeId: string, body: { reason: PhraseRejectReason; note?: string }) =>
  fetchWithAuth<unknown>(`${TAKE_BASE}/${encodeURIComponent(takeId)}/reject`, { method: 'POST', body: JSON.stringify(body) });
