/** Sample proposals for the link tests (shapes of `GET /words/proposals`). */

import type { FamilyProposal, PictureProposal } from "../../api/wordProposals";

export const familyProposal = (o: Partial<FamilyProposal> = {}): FamilyProposal => ({
  id: "family:w-kitab",
  kind: "family",
  slug: "book",
  slug_clash: false,
  gloss: "book",
  headword_id: "w-kitab",
  headword: "كِتَاب",
  members: [
    { id: "w-kitab", arabic: "كِتَاب", reason: "headword", family_id: null, reads_as_id: null },
    { id: "w-kitabu", arabic: "كِتَابُ", reason: "case_variant", of: "w-kitab", family_id: null, reads_as_id: null },
  ],
  existing_family_ids: [],
  ...o,
});

export const pictureProposal = (o: Partial<PictureProposal> = {}): PictureProposal => ({
  id: "picture:a-1",
  kind: "picture",
  asset_id: "a-1",
  path: "assets/animals/sea-lion.png",
  status: "active",
  proposed_slug: "sea-lion",
  proposed_arabic: "فُقْمَة",
  concept: null,
  agreement: "data_only",
  evidence: { name_stem: "sea-lion", source: "mcq", meaning: null, activities: 3, correct_slots: 2 },
  library_matches: [],
  ...o,
});
