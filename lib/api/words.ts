/**
 * Word library endpoints on the `words` edge function.
 */

import { fetchWithAuth } from '@/lib/api/client';
import { suggestHarakatRequest, type SuggestHarakatResponse } from '@/lib/blendWord/harakat';
import type { BlendEnding } from '@/lib/blendWord/config';
import type { AiCheckResult, BlendReviewList, SplitReviewBody, WordBlend } from '@/lib/blendWord/review';
import type { GenerateAudioInput, TakeReviewBody } from '@/lib/blendWord/takes';

/**
 * `POST /words/suggest-harakat` (staff only, SB-B8). Writes nothing. Throws
 * `ApiError` with code `SPEND_DISABLED` / `SPEND_BUDGET_EXCEEDED` (503) or
 * `PROVIDER_RATE_LIMITED` (429).
 */
export async function suggestHarakat(text: string): Promise<SuggestHarakatResponse> {
  return fetchWithAuth<SuggestHarakatResponse>('/words/suggest-harakat', {
    method: 'POST',
    body: JSON.stringify(suggestHarakatRequest(text)),
  });
}

// ---------------------------------------------------------------------------
// Blend review and word audio (SB-B6b, SB-B9; SB-S3, SB-S4). Staff only.
// Every refusal is an `ApiError` with the backend's code and details; the
// messages in plain words live in lib/blendWord/takes.ts and review.ts.
// ---------------------------------------------------------------------------

const enc = encodeURIComponent;

/** `GET /words/blend/review`: the words with a split or a take waiting for a person. */
export async function listBlendReview(limit = 200): Promise<BlendReviewList> {
  return fetchWithAuth<BlendReviewList>(`/words/blend/review?limit=${limit}`);
}

/** `GET /words/:wordId/blend`: one saved word's splits and every take, whatever their status (404 for an unknown word). */
export async function getWordBlend(wordId: string): Promise<WordBlend> {
  return fetchWithAuth<WordBlend>(`/words/${enc(wordId)}/blend`);
}

/** `POST /words/blend/:wordId/:form/review`: approve or reject a split. */
export async function reviewWordBlend(wordId: string, form: BlendEnding, body: SplitReviewBody): Promise<unknown> {
  return fetchWithAuth(`/words/blend/${enc(wordId)}/${form}/review`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** `POST /words/blend/qa/ai-check`: the AI flag batch (gated: 503 while it is switched off). */
export async function runBlendAiCheck(wordIds?: string[]): Promise<AiCheckResult> {
  return fetchWithAuth<AiCheckResult>('/words/blend/qa/ai-check', {
    method: 'POST',
    body: JSON.stringify(wordIds && wordIds.length > 0 ? { wordIds } : {}),
  });
}

/** `POST /words/:wordId/audio/:takeId/review`: approve a take, or reject it (and maybe regenerate). */
export async function reviewTake(wordId: string, takeId: string, body: TakeReviewBody): Promise<unknown> {
  return fetchWithAuth(`/words/${enc(wordId)}/audio/${enc(takeId)}/review`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** `PUT /words/:wordId/audio/:takeId/marks`: corrected boundaries; 400 `TAKE_MARKS_INVALID` with flags. */
export async function correctTakeMarks(wordId: string, takeId: string, marks: number[]): Promise<unknown> {
  return fetchWithAuth(`/words/${enc(wordId)}/audio/${enc(takeId)}/marks`, {
    method: 'PUT',
    body: JSON.stringify({ marks }),
  });
}

/** `POST /words/:wordId/audio/generate`: Generate or Regenerate one form (503 while ElevenLabs is off). */
export async function generateWordAudio(wordId: string, body: GenerateAudioInput): Promise<unknown> {
  return fetchWithAuth(`/words/${enc(wordId)}/audio/generate`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
