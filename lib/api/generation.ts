/**
 * AI activity drafts (CM-B22, `curriculum` edge function). Requesting drafts and reading the
 * queue is staff; approve, reject and the exemplar flag need a curriculum lead. Approving does
 * not publish: publishing stays the normal activity update.
 */

import { fetchWithAuth } from './client';
import type {
  DraftRequestResult,
  DraftRow,
  DraftState,
  WordRequest,
} from '@/lib/generation/drafts';

const BASE = '/curriculum/generation';

export const listNodeDrafts = (nodeId: string) =>
  fetchWithAuth<DraftRow[]>(`${BASE}/nodes/${encodeURIComponent(nodeId)}/drafts`);

/** Asks the backend for one draft. Answers 503 GENERATION_DISABLED while generation is off. */
export const requestNodeDraft = (nodeId: string, body: { type: string; requiredForm?: string }) =>
  fetchWithAuth<DraftRequestResult>(`${BASE}/nodes/${encodeURIComponent(nodeId)}/drafts`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const approveDraft = (activityId: string) =>
  fetchWithAuth<DraftState>(`${BASE}/drafts/${encodeURIComponent(activityId)}/approve`, {
    method: 'POST',
  });

export const rejectDraft = (activityId: string, reason?: string) =>
  fetchWithAuth<DraftState>(`${BASE}/drafts/${encodeURIComponent(activityId)}/reject`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  });

export const setExemplar = (activityId: string, isExemplar: boolean) =>
  fetchWithAuth<DraftState>(`${BASE}/exemplars/${encodeURIComponent(activityId)}`, {
    method: 'PUT',
    body: JSON.stringify({ is_exemplar: isExemplar }),
  });

export const listWordRequests = (status: WordRequest['status'] = 'open', limit = 50) =>
  fetchWithAuth<WordRequest[]>(`${BASE}/word-requests?status=${status}&limit=${limit}`);

export const fulfilWordRequest = (id: string, wordId: string) =>
  fetchWithAuth<WordRequest>(`${BASE}/word-requests/${encodeURIComponent(id)}/fulfil`, {
    method: 'POST',
    body: JSON.stringify({ word_id: wordId }),
  });

export const declineWordRequest = (id: string, reason?: string) =>
  fetchWithAuth<WordRequest>(`${BASE}/word-requests/${encodeURIComponent(id)}/decline`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  });
