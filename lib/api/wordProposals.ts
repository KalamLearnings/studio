/**
 * `GET /words/proposals` (staff): proposed connections for Review, computed
 * on each read from the release dry run (CM-D2 families, CM-C4 pictures).
 * Nothing is stored and there is no dismiss: an applied proposal drops out by
 * itself, a skipped one comes back (Studio keeps its own skipped list).
 * Approving goes through the gated link routes.
 */

import { fetchWithAuth } from './client';
import type { AssetStatus } from '@/lib/types/assetRegistry';
import type { ConceptName } from '@/lib/types/wordFamilies';

export type ProposalMemberReason = 'headword' | 'case_variant' | 'reads_as';

export interface FamilyProposalMember {
  id: string;
  arabic: string;
  reason: ProposalMemberReason;
  /** For `reads_as`: the row it would be read as; for `case_variant`: the headword. */
  of?: string;
  family_id: string | null;
  reads_as_id: string | null;
}

export interface FamilyProposal {
  /** `family:<headword id>`. */
  id: string;
  kind: 'family';
  /** Null when no gloss gives one: a person names it. */
  slug: string | null;
  slug_clash: boolean;
  gloss: string | null;
  headword_id: string;
  headword: string;
  members: FamilyProposalMember[];
  existing_family_ids: string[];
}

export interface PictureProposal {
  /** `picture:<asset id>`. */
  id: string;
  kind: 'picture';
  asset_id: string;
  path: string;
  status: AssetStatus;
  proposed_slug: string;
  proposed_arabic: string | null;
  /** The concept with that slug; null: create it first. */
  concept: { id: string; slug: string; name: ConceptName } | null;
  agreement: string;
  evidence: {
    name_stem: string | null;
    source: string | null;
    meaning: unknown;
    activities: number;
    correct_slots: number;
  };
  library_matches: Array<{ id: string; arabic: string; family_id: string | null }>;
  /** Some deployments add the file's URL; Studio builds it from the path otherwise. */
  url?: string;
}

export interface WordProposals {
  version: string;
  families: FamilyProposal[];
  pictures: PictureProposal[];
  unregistered_pictures: number;
}

export const listWordProposals = () => fetchWithAuth<WordProposals>('/words/proposals');
