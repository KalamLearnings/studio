/**
 * Word families, concepts and their links (content model CM-B10, CM-B11; Studio CM-S5).
 *
 * Mirrors `kalam-readers-backend` `core/domain/words/family.ts`,
 * `core/domain/concepts/concept.ts` and the `PictureView` of
 * `core/application/concepts/concepts.ts`. Rows keep the backend's snake_case
 * (they are passed through unchanged); the views the backend builds are camelCase.
 */

import type { AssetLabel, AssetStatus } from './assetRegistry';

/** The curation columns every spelling row carries (CM-B10). */
export interface WordCurationFields {
  family_id: string | null;
  reads_as_id: string | null;
  retired_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

/** A spelling row as the family editor uses it (`GET /words`, a family's `members`). */
export interface CuratedWord extends WordCurationFields {
  id: string;
  arabic: string;
  english: string | null;
  is_pseudo: boolean;
  usage_count: number;
}

export interface WordFamily {
  /** Text slug, e.g. `book`. Never re-keyed. */
  id: string;
  headword_id: string | null;
  /** The English meaning; the source text for every other locale. Arabic is never translated. */
  gloss_en: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** `GET /words/families/:familyId`: the family with its spellings, retired ones included. */
export interface WordFamilyDetail extends WordFamily {
  members: CuratedWord[];
}

export interface CreateWordFamilyBody {
  id: string;
  headwordId?: string | null;
  glossEn?: string | null;
  notes?: string | null;
}

/** `PATCH /words/families/:familyId`: only the fields given change. */
export interface UpdateWordFamilyBody {
  headwordId?: string | null;
  glossEn?: string | null;
  notes?: string | null;
}

export const CONCEPT_KINDS = [
  'animal',
  'food',
  'object',
  'body',
  'person',
  'place',
  'nature',
  'shape',
  'quality',
  'other',
] as const;
export type ConceptKind = (typeof CONCEPT_KINDS)[number];

export interface ConceptName {
  en: string;
  ar?: string;
}

export interface Concept {
  /** uuid. */
  id: string;
  /** The `concept:<slug>` unit key. Never re-keyed. */
  slug: string;
  name: ConceptName;
  kind: ConceptKind | null;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateConceptBody {
  slug: string;
  name: ConceptName;
  kind?: ConceptKind | null;
}

/** `PATCH /words/concepts/:concept`: the slug never changes. */
export interface UpdateConceptBody {
  name?: ConceptName;
  kind?: ConceptKind | null;
}

export interface ContentAssetLink {
  id: string;
  asset_id: string;
  sort_order: number;
  [key: string]: unknown;
}

/** A picture as the editor shows it. */
export interface PictureView {
  assetId: string;
  url: string;
  status: AssetStatus;
  label: AssetLabel;
  link: ContentAssetLink;
}

/** `GET /words/concepts/:concept`. */
export interface ConceptDetail extends Concept {
  unitKey: string;
  /** The families that name the concept (`depicts`), oldest link first. */
  families: WordFamily[];
  pictures: PictureView[];
}
