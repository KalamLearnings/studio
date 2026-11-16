/**
 * Whole-phrase audio takes in Studio (content model CM-S14; backend
 * `curriculum/reading/phrases/:key/audio`, CM-B37). Pure: no React, no fetch.
 * The server decides every status and who may act; these shape what the page
 * shows and what it sends.
 */

import type { TakeRequest } from '@/lib/blendWord/takes';

export type PhraseTakeStatus = 'pending' | 'needs_review' | 'approved' | 'rejected' | 'failed';

export interface PhraseAudioTake {
  id: string;
  status: PhraseTakeStatus;
  text: string;
  current: boolean;
  served: boolean;
  url: string | null;
  asset_id: string | null;
  duration_ms: number | null;
  voice_id: string | null;
  settings: unknown;
  error: string | null;
  requested_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface PhraseAudioStatus {
  phrase_key: string;
  word_ids: string[];
  text: string | null;
  phrase_approved: boolean;
  is_sentence: boolean;
  generation_enabled: boolean;
  served_take_id: string | null;
  /** Newest first. */
  takes: PhraseAudioTake[];
}

export interface GeneratePhraseAudioResult {
  take: PhraseAudioTake;
  created: boolean;
}

export const PHRASE_REJECT_REASONS = [
  'wrong_vowel',
  'wrong_case_ending',
  'wrong_join',
  'wrong_word',
  'unclear',
  'unnatural',
  'noise',
  'other',
] as const;
export type PhraseRejectReason = (typeof PHRASE_REJECT_REASONS)[number];

export const PHRASE_REJECT_LABELS: Record<PhraseRejectReason, string> = {
  wrong_vowel: 'Wrong vowel',
  wrong_case_ending: 'Wrong case ending',
  wrong_join: 'Wrong join between words',
  wrong_word: 'Wrong word',
  unclear: 'Unclear',
  unnatural: 'Does not sound natural',
  noise: 'Noise',
  other: 'Other (say why in the note)',
};

export const GENERATION_OFF_TEXT = 'Recording is switched off until the owner turns it on.';

const NOTE_MAX = 500;

export function phraseAudioKeyPath(phraseKey: string): string {
  return encodeURIComponent(phraseKey);
}

/** The take a reviewer hears and acts on: the served one, else the newest current take. */
export function currentTake(status: Pick<PhraseAudioStatus, 'takes' | 'served_take_id'>): PhraseAudioTake | null {
  const served = status.takes.find((t) => t.id === status.served_take_id || t.served);
  if (served) return served;
  return status.takes.find((t) => t.current) ?? null;
}

/** A take waiting for the reviewer, newest first. */
export function takeToReview(status: Pick<PhraseAudioStatus, 'takes'>): PhraseAudioTake | null {
  return status.takes.find((t) => t.current && t.status === 'needs_review') ?? null;
}

export function hasTakeInProgress(status: Pick<PhraseAudioStatus, 'takes'>): boolean {
  return status.takes.some((t) => t.current && t.status === 'pending');
}

/** One plain line for the phrase's audio state. */
export function audioSummary(status: PhraseAudioStatus): string {
  if (!status.phrase_approved) return 'Approve the phrase before recording it.';
  if (status.takes.some((t) => t.served)) return 'Approved audio is in use.';
  if (takeToReview(status)) return 'A recording waits for review.';
  if (hasTakeInProgress(status)) return 'A recording is being made.';
  const latest = status.takes.find((t) => t.current) ?? status.takes[0];
  if (latest?.status === 'failed') return 'The last recording failed.';
  if (latest?.status === 'rejected') return 'The last recording was rejected.';
  return 'No audio yet.';
}

export const TAKE_STATUS_LABELS: Record<PhraseTakeStatus, string> = {
  pending: 'Being made',
  needs_review: 'Needs review',
  approved: 'Approved',
  rejected: 'Rejected',
  failed: 'Failed',
};

export interface PhraseAudioActions {
  /** Generate (first take) or Regenerate (more). */
  generate: boolean;
  approve: boolean;
  reject: boolean;
}

/** What the viewer may do; `canReview` is the phrase reviewer / lead role. */
export function phraseAudioActions(status: PhraseAudioStatus, canReview: boolean): PhraseAudioActions {
  const none = { generate: false, approve: false, reject: false };
  if (!canReview || !status.phrase_approved) return none;
  const review = takeToReview(status);
  const served = status.takes.find((t) => t.served);
  return {
    generate: status.generation_enabled && !hasTakeInProgress(status),
    approve: review !== null,
    reject: review !== null || served !== undefined,
  };
}

/** The take a reject acts on: the one waiting for review, else the served one. */
export function takeToReject(status: PhraseAudioStatus): PhraseAudioTake | null {
  return takeToReview(status) ?? status.takes.find((t) => t.served) ?? null;
}

export type RejectBodyResult =
  | { ok: true; body: { reason: PhraseRejectReason; note?: string } }
  | { ok: false; error: string };

export function phraseRejectBody(reason: string, note: string): RejectBodyResult {
  if (!(PHRASE_REJECT_REASONS as readonly string[]).includes(reason)) return { ok: false, error: 'Pick a reason.' };
  const trimmed = note.trim();
  if (reason === 'other' && !trimmed) return { ok: false, error: 'Say why in the note.' };
  if (trimmed.length > NOTE_MAX) return { ok: false, error: `The note is too long (${NOTE_MAX} characters at most).` };
  return { ok: true, body: { reason: reason as PhraseRejectReason, ...(trimmed ? { note: trimmed } : {}) } };
}

/** The body a generate sends: settings only when the reviewer set some. */
export function generateBody(settings: TakeRequest | null): { settings?: TakeRequest } {
  return settings && Object.keys(settings).length > 0 ? { settings } : {};
}

const OFF_CODES = new Set(['PHRASE_AUDIO_GENERATION_DISABLED', 'SPEND_DISABLED']);

/** Recording is off (a switch, not a fault): shown calmly, not as an error. */
export function isGenerationOff(error: unknown): boolean {
  const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : undefined;
  return typeof code === 'string' && OFF_CODES.has(code);
}

const ERRORS: Record<string, string> = {
  SPEND_BUDGET_EXCEEDED: 'The recording budget is used up for now. Try again once the owner raises it.',
  PHRASE_NOT_APPROVED: 'Approve the phrase first.',
  PHRASE_AUDIO_IN_PROGRESS: 'A recording is already being made for this phrase.',
  PHRASE_TAKE_NOT_REVIEWABLE: 'This take is no longer waiting for review. The list has been refreshed.',
  PHRASE_TAKE_STALE: 'This take is out of date because the phrase changed. Make a new one.',
  PHRASE_TAKE_NOT_REJECTABLE: 'This take cannot be rejected now.',
  PHRASE_REVIEWER_REQUIRED: 'Only a phrase reviewer or a curriculum lead may do this.',
};

export function phraseAudioErrorText(error: unknown): string {
  if (isGenerationOff(error)) return GENERATION_OFF_TEXT;
  const e = error && typeof error === 'object' ? (error as { code?: unknown; message?: unknown; status?: unknown }) : {};
  if (typeof e.code === 'string' && ERRORS[e.code]) return ERRORS[e.code];
  if (e.status === 404) return 'That take or phrase was not found.';
  if (e.code === 'PHRASE_WORDS_INVALID') return 'A word in this phrase is no longer valid, so it cannot be recorded.';
  return typeof e.message === 'string' ? e.message : 'The request failed.';
}
