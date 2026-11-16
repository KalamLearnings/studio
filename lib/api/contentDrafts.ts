/**
 * `GET /words/content-drafts` (staff, CM-DRAFTS): drafted English meanings
 * (C5) and picture labels (C4), imported on the backend
 * (`scripts/import-content-drafts.ts`). Per word or picture the newest draft,
 * joined with the library as it is, and whether it is applied already.
 * Read only: approving goes through the gated family, concept and picture
 * routes; the backend has no dismiss (Studio keeps its own skipped list).
 */

import { fetchWithAuth } from './client';
import type { AssetStatus } from '@/lib/types/assetRegistry';
import type { ConceptName } from '@/lib/types/wordFamilies';

export type DraftConfidence = 'high' | 'medium' | 'low';

export interface DraftWord {
  id: string;
  arabic: string;
  family_id: string | null;
  reads_as_id: string | null;
  is_pseudo: boolean;
}

export interface DraftFamily {
  id: string;
  headword_id: string | null;
  gloss_en: string | null;
}

interface DraftBase {
  source: string;
  run_id: string;
  created_at: string;
  confidence: DraftConfidence;
  /** The drafter's own number (0 to 1), when it gave one. */
  confidence_score: number | null;
  note: string | null;
  /** The spelling; null when the bank does not have it. */
  word: DraftWord | null;
  /** The family the draft writes to: the spelling's own, else its reading's. Null: approving starts one. */
  family: DraftFamily | null;
  /** The library already says what the draft says. */
  applied: boolean;
}

export interface MeaningDraft extends DraftBase {
  /** `meaning:<word id>`. */
  id: string;
  kind: 'meaning';
  word_id: string;
  gloss_en: string;
  part_of_speech: string | null;
  usage_count: number | null;
  drafted_arabic: string | null;
}

export interface PictureLabelDraft extends DraftBase {
  /** `label:<asset id>`. */
  id: string;
  kind: 'label';
  asset_id: string;
  path: string | null;
  /** Null when the backend has no public host; Studio builds it from the path. */
  url: string | null;
  /** Null when the asset registry has no row for the file. */
  status: AssetStatus | null;
  concept_slug: string;
  concept_en: string;
  word_id: string | null;
  arabic: string | null;
  needs_word: boolean;
  agrees_with_data: boolean | null;
  /** The meaning with the drafted slug; null: approving creates it. */
  concept: { id: string; slug: string; name: ConceptName } | null;
  /** The meanings the picture is attached to now, by slug. */
  picture_concepts: string[];
  /** The meanings `family` names now, by slug. */
  family_concepts: string[];
}

export interface ContentDrafts {
  meanings: MeaningDraft[];
  pictures: PictureLabelDraft[];
}

export const listContentDrafts = () => fetchWithAuth<ContentDrafts>('/words/content-drafts');
