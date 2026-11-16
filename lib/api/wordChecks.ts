/**
 * Automatic word-check suggestions (`words` edge function, CM-AIPRE), staff only.
 * Advice for the reviewer: the backend never applies one; the reviewer may, through
 * the fix-harakat path.
 */

import { fetchWithAuth } from './client';
import type { WordCheckSummary } from '@/lib/review/wordChecks';

/** `GET /words/check-suggestions`: every word that has a suggestion. */
export async function listWordChecks(): Promise<WordCheckSummary[]> {
  return (await fetchWithAuth<{ items: WordCheckSummary[] }>('/words/check-suggestions')).items ?? [];
}
