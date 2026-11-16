/**
 * What approving a Suggested link sends (Review's `link` lens), as
 * connection ops (`lib/connections/ops.ts`). Pure.
 *
 * A family proposal puts every member in one family: the headword's own
 * family when it has one, else the proposal's id (created when no family has
 * it; joined when one does), then confirms the readings it proposes. A picture
 * proposal creates the meaning when it does not exist, then attaches the
 * picture to it.
 */

import type { FamilyProposal, PictureProposal } from "../api/wordProposals";
import { isSlug } from "../words/family";
import { planMoveIntoFamily, type Op, type SpellingLookup } from "../connections/ops";
import { humaniseSlug } from "./normalise/links";

export interface FamilyName {
  slug: string;
  gloss: string | null;
}

export type FamilyPlan =
  | { ok: true; familyId: string; create: boolean; ops: Op[] }
  | { ok: false; reason: string };

/**
 * `words` answers from the loaded word bank; a member the bank does not hold
 * falls back to where the proposal says it is. `name` is the reviewer's own
 * id and gloss (required when the proposal has no id or a clashing one).
 */
export function planFamilyProposal(
  p: FamilyProposal,
  words: SpellingLookup,
  families: ReadonlyMap<string, { headword_id: string | null }>,
  name?: FamilyName | null,
): FamilyPlan {
  const byId = new Map(p.members.map((m) => [m.id, m]));
  const lookup: SpellingLookup = (id) => {
    const known = words(id);
    if (known) return known;
    const m = byId.get(id);
    return m ? { familyId: m.family_id, readsAsId: m.reads_as_id } : undefined;
  };
  const headFamily = lookup(p.headword_id)?.familyId ?? null;
  let familyId: string;
  let create = false;
  if (headFamily) {
    familyId = headFamily;
  } else {
    const needsName = p.slug === null || p.slug_clash;
    const slug = (name?.slug ?? (needsName ? "" : p.slug ?? "")).trim();
    if (!slug) return { ok: false, reason: "Give the word an id first." };
    if (!isSlug(slug)) return { ok: false, reason: "Use lowercase letters and digits joined by single - or _." };
    if (p.slug_clash && slug === p.slug) return { ok: false, reason: "Another suggestion took this id first. Pick another id." };
    familyId = slug;
    create = !families.has(slug);
  }
  const readings = p.members
    .filter((m) => m.reason === "reads_as" && m.of && m.reads_as_id !== m.of)
    .map((m) => ({ wordId: m.id, readsAsId: m.of! }));
  const ops = planMoveIntoFamily(lookup, {
    familyId,
    create: create ? { gloss: name?.gloss ?? p.gloss } : null,
    headwordId: p.headword_id,
    currentHeadwordId: create ? null : (families.get(familyId)?.headword_id ?? null),
    wordIds: p.members.map((m) => m.id),
    readings,
  });
  return { ok: true, familyId, create, ops };
}

export interface MeaningName {
  en: string;
  ar?: string | null;
}

/** The meaning's name for a new concept: the slug made readable, the proposal's Arabic. */
export const defaultMeaningName = (p: PictureProposal): MeaningName => ({
  en: p.concept?.name.en ?? humaniseSlug(p.proposed_slug),
  ar: p.concept?.name.ar ?? p.proposed_arabic ?? null,
});

export function planPictureProposal(p: PictureProposal, name?: MeaningName | null): Op[] {
  if (p.concept) return [{ op: "attachPicture", concept: p.concept.slug, assetId: p.asset_id }];
  const n = name ?? defaultMeaningName(p);
  const ar = n.ar?.trim();
  return [
    { op: "createConcept", slug: p.proposed_slug, name: { en: n.en.trim() || humaniseSlug(p.proposed_slug), ...(ar ? { ar } : {}) }, kind: null },
    { op: "attachPicture", concept: p.proposed_slug, assetId: p.asset_id },
  ];
}
