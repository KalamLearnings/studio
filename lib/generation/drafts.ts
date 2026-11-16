/**
 * Pure rules of the AI drafts queue (CM-S9): the backend's shapes (CM-B22), who is a curriculum
 * lead, a draft's status, and the plain-language wording of the backend's refusals.
 */

import { ApiError } from '@/lib/api/client';

export interface DraftCheckResult {
  check: string;
  /** `note`: an informational check (decodability) found something; never a failure (backend CM-C11a). */
  status: 'pass' | 'fail' | 'note';
}

export interface DraftProvenance {
  origin: 'ai_draft';
  provider: string;
  model: string;
  template: { type: string; version: string };
  prompt_version: string;
  exemplar_ids: string[];
  required_form: string | null;
  requested_by: string;
  created_at: string;
  checks: DraftCheckResult[];
  edits?: Array<{ editor_id: string | null; at: string }>;
  review?: { decision: 'rejected'; by: string; at: string; reason: string | null };
}

export interface DraftState {
  id: string;
  node_id: string;
  type: string;
  is_published: boolean | null;
  is_exemplar: boolean;
  provenance: DraftProvenance | null;
  approved_by: string | null;
  approved_at: string | null;
}

export interface DraftRow extends DraftState {
  config: Record<string, unknown> | null;
  created_at: string | null;
}

export interface WordRequest {
  id: string;
  node_id: string;
  activity_type: string;
  letters: unknown[];
  description_en: string;
  status: 'open' | 'fulfilled' | 'declined';
  requested_by: string;
  created_at: string;
  fulfilled_word_id?: string | null;
  decline_reason?: string | null;
}

/** Spellings that may satisfy a word request: reviewed, not retired, not a drill (the server checks the same). */
export function fulfilingWords<W extends { reviewed_at: string | null; retired_at: string | null; is_pseudo: boolean }>(
  words: readonly W[],
): W[] {
  return words.filter((w) => w.reviewed_at !== null && w.retired_at === null && !w.is_pseudo);
}

/** The answer of `POST .../nodes/:nodeId/drafts`. */
export type DraftRequestResult =
  | { status: 'drafted'; activity: { id: string }; provenance: DraftProvenance }
  | { status: 'word_requested'; wordRequest: WordRequest }
  | { status: 'rejected'; checks: DraftCheckResult[]; details?: unknown }
  | { status: 'no_draft'; reason: string; issues: string[] };

/** The types the generator supports; any other answers 501 GENERATION_TYPE_UNSUPPORTED. */
export const GENERATION_TYPES = [
  { value: 'grid_tap', label: 'Grid tap (themed hunts)' },
  { value: 'tap_letter_in_word', label: 'Tap the letter in a word' },
] as const;

/** A curriculum lead is staff whose `app_metadata.curriculum_lead` is `true` (the server decides; this only shows the buttons). */
export function isCurriculumLead(
  user: { app_metadata?: Record<string, unknown> | null } | null | undefined,
): boolean {
  return user?.app_metadata?.curriculum_lead === true;
}

export type DraftStatus = 'pending' | 'approved' | 'rejected' | 'published';

export function draftStatus(d: Pick<DraftState, 'provenance' | 'approved_by' | 'is_published'>): DraftStatus {
  if (d.provenance?.review?.decision === 'rejected') return 'rejected';
  if (d.is_published) return 'published';
  return d.approved_by ? 'approved' : 'pending';
}

export const STATUS_LABELS: Record<DraftStatus, string> = {
  pending: 'Waiting for approval',
  approved: 'Approved, not published',
  rejected: 'Rejected',
  published: 'Published',
};

/** Pending drafts first, then approved, rejected, published; newest first inside a status. */
export function sortDrafts<T extends DraftRow>(rows: T[]): T[] {
  const rank: Record<DraftStatus, number> = { pending: 0, approved: 1, rejected: 2, published: 3 };
  return [...rows].sort(
    (a, b) =>
      rank[draftStatus(a)] - rank[draftStatus(b)] ||
      (b.created_at ?? '').localeCompare(a.created_at ?? ''),
  );
}

export const failedChecks = (p: DraftProvenance | null | undefined): DraftCheckResult[] =>
  (p?.checks ?? []).filter((c) => c.status === 'fail');

/** What a draft request produced, in one line for the author. */
export function describeRequestResult(r: DraftRequestResult): string {
  switch (r.status) {
    case 'drafted':
      return 'A draft was saved. It waits for a curriculum lead before it can be published.';
    case 'word_requested':
      return `No reviewed word fits, so a word request was opened: ${r.wordRequest.description_en}`;
    case 'rejected': {
      const failed = r.checks.filter((c) => c.status === 'fail').map((c) => c.check);
      return `The draft failed the save checks and was not stored${failed.length ? `: ${failed.join(', ')}` : ''}.`;
    }
    case 'no_draft':
      return `The generator gave no usable draft (${r.reason})${r.issues.length ? `: ${r.issues.join('; ')}` : ''}.`;
  }
}

/** The backend's refusals of the drafts routes, as plain messages. */
export function describeGenerationError(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case 'GENERATION_DISABLED':
        return 'Draft generation is switched off right now. Nothing was requested.';
      case 'GENERATION_TYPE_UNSUPPORTED':
        return 'Drafts cannot be generated for this activity type yet.';
      case 'CURRICULUM_LEAD_REQUIRED':
        return 'Only a curriculum lead can do this.';
      case 'DRAFT_NOT_APPROVED':
        return 'This is an AI draft and a curriculum lead has not approved it yet, so it cannot be published. Approve it in Draft review first.';
      case 'DRAFT_REJECTED':
        return 'A rejected draft cannot be approved. Request a new draft.';
      case 'NOT_A_DRAFT':
        return 'This activity is not an AI draft.';
      case 'EXEMPLAR_NOT_HUMAN':
        return 'An AI draft cannot be an exemplar.';
      case 'EXEMPLAR_NOT_PUBLISHED':
        return 'Only a published activity can be an exemplar.';
      case 'WORD_NOT_FULFILLING':
        return 'That word cannot fulfil the request: it must exist, be reviewed, not retired and not a drill.';
      case 'WORD_REQUEST_CLOSED':
        return 'Someone already fulfilled or declined this request.';
      case 'DRAFT_CHECK_FAILED':
        return 'The draft failed the save checks and was not stored.';
    }
    if (e.status === 503) return 'Draft generation is switched off right now. Nothing was requested.';
    if (e.status === 403) return 'You do not have permission to do this.';
    return e.message;
  }
  return e instanceof Error ? e.message : 'The request failed.';
}
