/**
 * What approving a drafted meaning or picture label sends (Review's
 * `meaning` and `label` lenses, CM-DRAFTS), as connection ops
 * (`lib/connections/ops.ts`), so `runOps` sends them in order, undoes the
 * sent ones if a later one is refused, and Undo sends their inverse. Pure.
 *
 * A meaning writes the gloss to the word's family (its own, or the family
 * of the spelling it is read as); when it has none, it starts one with the
 * spelling as its dictionary form (the spelling it is read as, for an
 * unvowelled one) and the gloss.
 *
 * A picture label creates the meaning when it does not exist, attaches the
 * picture to it, and has the word's family name it, starting the family
 * first when the word has none. Steps already in place are left out.
 */

import type { MeaningDraft, PictureLabelDraft } from "../api/contentDrafts";
import type { ConceptName } from "../types/wordFamilies";
import { isSlug, slugFromText } from "../words/family";
import type { Op } from "../connections/ops";

export type DraftPlan = { ok: true; ops: Op[]; newFamilyId: string | null } | { ok: false; reason: string };

/** The family ids that exist (a new family's id must not be one). */
export type FamilyIds = Pick<ReadonlySet<string>, "has"> | Pick<ReadonlyMap<string, unknown>, "has">;

const PRACTICE = "This spelling is a practice word: it has no meaning or family.";
const GONE = "This spelling is no longer in the word bank.";

/** The id a new family takes by default: `preferred` (or the gloss made a slug) when free; null otherwise. */
export function defaultFamilyId(preferred: string | null | undefined, gloss: string, families: FamilyIds): string | null {
  for (const candidate of [preferred, slugFromText(gloss)]) {
    if (candidate && isSlug(candidate) && !families.has(candidate)) return candidate;
  }
  return null;
}

function checkNewId(id: string, families: FamilyIds): string | null {
  if (!id) return "Give the new word an id first.";
  if (!isSlug(id)) return "Use lowercase letters and digits joined by single - or _.";
  if (families.has(id)) return `A word with the id ${id} exists. Pick another id.`;
  return null;
}

export interface MeaningChoice {
  /** The reviewer's gloss (defaults to the draft's). */
  gloss?: string;
  /** The new family's id when one is started (defaults to the gloss made a slug). */
  familyId?: string;
}

export function planMeaningDraft(d: MeaningDraft, families: FamilyIds, choice: MeaningChoice = {}): DraftPlan {
  const gloss = (choice.gloss ?? d.gloss_en).trim();
  if (!gloss) return { ok: false, reason: "Write the English meaning first." };
  if (gloss.length > 200) return { ok: false, reason: "The meaning may be at most 200 characters." };
  if (d.family) {
    const prev = d.family.gloss_en ?? null;
    if ((prev ?? "").trim() === gloss) return { ok: false, reason: "The word already has this meaning." };
    return { ok: true, ops: [{ op: "setGloss", familyId: d.family.id, gloss, prev }], newFamilyId: null };
  }
  if (!d.word) return { ok: false, reason: GONE };
  if (d.word.is_pseudo) return { ok: false, reason: PRACTICE };
  const id = (choice.familyId ?? defaultFamilyId(null, gloss, families) ?? "").trim();
  const bad = checkNewId(id, families);
  if (bad) return { ok: false, reason: bad };
  return {
    ok: true,
    ops: [{ op: "createFamily", familyId: id, gloss, headwordId: d.word.reads_as_id ?? d.word.id }],
    newFamilyId: id,
  };
}

export interface LabelChoice {
  /** The new meaning's names (default: the drafted English name and Arabic). */
  name?: ConceptName;
  /** The new family's id when the word has none (default: the meaning's slug, else its name made a slug). */
  familyId?: string;
}

export const defaultLabelName = (d: PictureLabelDraft): ConceptName => {
  const ar = (d.concept?.name.ar ?? d.arabic ?? "").trim();
  return { en: d.concept?.name.en ?? d.concept_en, ...(ar ? { ar } : {}) };
};

export function planLabelDraft(d: PictureLabelDraft, families: FamilyIds, choice: LabelChoice = {}): DraftPlan {
  if (d.status === null) return { ok: false, reason: "This picture is not in the asset registry, so it cannot be connected." };
  const slug = d.concept_slug;
  const ops: Op[] = [];
  if (!d.concept) {
    const n = choice.name ?? defaultLabelName(d);
    const en = n.en.trim();
    if (!en) return { ok: false, reason: "Give the new meaning an English name first." };
    const ar = n.ar?.trim();
    ops.push({ op: "createConcept", slug, name: { en, ...(ar ? { ar } : {}) }, kind: null });
  }
  if (!d.picture_concepts.includes(slug)) ops.push({ op: "attachPicture", concept: slug, assetId: d.asset_id });
  let newFamilyId: string | null = null;
  if (d.word_id) {
    let familyId = d.family?.id ?? null;
    if (!familyId) {
      if (!d.word) return { ok: false, reason: GONE };
      if (d.word.is_pseudo) return { ok: false, reason: PRACTICE };
      const id = (choice.familyId ?? defaultFamilyId(slug, d.concept_en, families) ?? "").trim();
      const bad = checkNewId(id, families);
      if (bad) return { ok: false, reason: bad };
      ops.push({ op: "createFamily", familyId: id, gloss: d.concept_en.trim() || null, headwordId: d.word.reads_as_id ?? d.word.id });
      familyId = newFamilyId = id;
    }
    if (newFamilyId || !d.family_concepts.includes(slug)) ops.push({ op: "linkConcept", familyId, concept: slug });
  }
  if (ops.length === 0) return { ok: false, reason: "Already connected." };
  return { ok: true, ops, newFamilyId };
}
