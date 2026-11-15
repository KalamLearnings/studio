/**
 * Phrase review in Studio (content model CM-S11; backend `curriculum/reading/phrases`).
 * Pure: no React, no fetch. The server decides who may approve; these only
 * shape what the page shows.
 */

import type { DecodabilityReport } from '@/lib/teachingTargets/decodability';

export interface PhraseWordProblem {
  word_id: string;
  issue: string;
  message: string;
}

export interface PhraseUse {
  activity_id: string;
  node_id: string;
  type: string;
  path: string;
  is_sentence: boolean;
}

export interface PhraseApproval {
  reviewed_by: string;
  reviewed_at: string;
  is_sentence: boolean;
}

export interface PhraseEntry {
  phrase_key: string;
  word_ids: string[];
  is_sentence: boolean;
  text: string | null;
  word_problems: PhraseWordProblem[];
  used_in: PhraseUse[];
  approval: PhraseApproval | null;
  reason: 'unreviewed' | 'flag_mismatch' | null;
}

export interface PhraseList {
  pending: PhraseEntry[];
  approved: PhraseEntry[];
}

export interface DraftPhraseDecodability {
  node_id: string;
  phrase_key: string;
  word_ids: string[];
  is_sentence: boolean;
  text: string | null;
  approved: boolean;
  word_problems: PhraseWordProblem[];
  report: DecodabilityReport;
}

/** A phrase reviewer is staff whose `app_metadata.phrase_reviewer` is `true`, or a curriculum lead. */
export function isPhraseReviewer(
  user: { app_metadata?: Record<string, unknown> | null } | null | undefined,
): boolean {
  const meta = user?.app_metadata;
  return meta?.phrase_reviewer === true || meta?.curriculum_lead === true;
}

export function reasonText(reason: PhraseEntry['reason']): string {
  if (reason === 'flag_mismatch') return 'Approved as the other kind (phrase or sentence); confirm it again.';
  if (reason === 'unreviewed') return 'No reviewer has approved it yet.';
  return '';
}

/** Where a phrase is used, one short line per use. */
export function usedInText(use: PhraseUse): string {
  return `${use.type} (${use.is_sentence ? 'sentence' : 'phrase'}) at ${use.path}`;
}

/** The body an approval sends. */
export function approvalBody(entry: Pick<PhraseEntry, 'word_ids' | 'is_sentence'>) {
  return { word_ids: entry.word_ids, is_sentence: entry.is_sentence };
}

const ERRORS: Record<string, string> = {
  PHRASE_REVIEWER_REQUIRED: 'Only a phrase reviewer or a curriculum lead may approve or revoke a phrase.',
};

/** The backend's refusal in plain language; word problems are listed from the error details. */
export function phraseReviewErrorText(error: unknown): string {
  const e = error && typeof error === 'object' ? (error as { code?: unknown; details?: unknown; message?: unknown }) : {};
  if (typeof e.code === 'string' && ERRORS[e.code]) return ERRORS[e.code];
  if (e.code === 'PHRASE_WORDS_INVALID' && Array.isArray(e.details)) {
    const lines = e.details
      .map((d) => (d && typeof (d as { message?: unknown }).message === 'string' ? (d as { message: string }).message : null))
      .filter((m): m is string => m !== null);
    if (lines.length) return `The phrase cannot be approved: ${lines.join('; ')}`;
  }
  return typeof e.message === 'string' ? e.message : 'The request failed.';
}
