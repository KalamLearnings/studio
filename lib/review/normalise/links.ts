/**
 * Suggested links (`GET /words/proposals`) as Review items. Pure.
 *
 * - A family proposal: "These look like forms of one word", titled by its
 *   headword. Bulk-safe only when every member is the headword or a case
 *   variant of it (no reading to confirm) and its id is known and unique.
 * - A picture proposal: "This picture looks like this meaning". Never bulk:
 *   a person looks at each picture.
 *
 * The backend stores no decision: an approved proposal drops out of the next
 * read, a skipped one comes back. Studio keeps the skipped ones per reviewer
 * (`lib/review/skippedLinks.ts`); they show as Skipped under Decided, where
 * "Show again" brings them back. `applied` holds proposals approved in this
 * session until the next read drops them.
 */

import type { FamilyProposal, PictureProposal, WordProposals } from "../../api/wordProposals";
import type { InboxItem, ItemState } from "../inbox";

export type LinkData =
  | { type: "family"; proposal: FamilyProposal }
  | { type: "picture"; proposal: PictureProposal };

export type LinkItem = InboxItem<"link", LinkData>;

export const FAMILY_LINK_TEXT = "These look like forms of one word";
export const PICTURE_LINK_TEXT = "This picture looks like this meaning";

/** Bulk approve is allowed for a family proposal of headword and case variants, with a known, unique id. */
export function familyProposalBulkSafe(p: FamilyProposal): boolean {
  return !p.slug_clash && p.slug !== null && p.members.every((m) => m.reason === "headword" || m.reason === "case_variant");
}

/** "sea-lion" to "Sea lion". */
export function humaniseSlug(slug: string): string {
  const s = slug.replace(/[-_]+/g, " ").trim();
  return s ? s[0].toUpperCase() + s.slice(1) : slug;
}

export interface LinkMarks {
  skipped: ReadonlySet<string>;
  applied: ReadonlySet<string>;
}

const stateOf = (id: string, marks: LinkMarks): ItemState =>
  marks.applied.has(id) ? "approved" : marks.skipped.has(id) ? "rejected" : "todo";

export function linkItems(proposals: Pick<WordProposals, "families" | "pictures">, marks: LinkMarks): LinkItem[] {
  const out: LinkItem[] = [];
  for (const p of proposals.families ?? []) {
    const n = p.members.length;
    const moves = p.existing_family_ids.length;
    out.push({
      key: `link:${p.id}`,
      kind: "link",
      id: p.id,
      title: p.headword,
      titleScript: "ar",
      state: stateOf(p.id, marks),
      context: `${FAMILY_LINK_TEXT}: ${n} ${n === 1 ? "spelling" : "spellings"}${p.gloss ? `, "${p.gloss}"` : ""}${moves ? `, ${moves === 1 ? "one is" : "some are"} in a word already` : ""}`,
      usage: n,
      waitingSince: null,
      searchText: [p.gloss, p.slug, ...p.members.map((m) => m.arabic), FAMILY_LINK_TEXT].filter(Boolean).join(" "),
      bulkSafe: familyProposalBulkSafe(p),
      familyId: p.members.find((m) => m.id === p.headword_id)?.family_id ?? null,
      data: { type: "family", proposal: p },
    });
  }
  for (const p of proposals.pictures ?? []) {
    const meaning = p.concept?.name.en ?? humaniseSlug(p.proposed_slug);
    out.push({
      key: `link:${p.id}`,
      kind: "link",
      id: p.id,
      title: p.proposed_arabic ?? meaning,
      titleScript: p.proposed_arabic ? "ar" : "latin",
      state: stateOf(p.id, marks),
      context: `${PICTURE_LINK_TEXT}: ${meaning}${p.concept ? "" : " (a new meaning)"}`,
      usage: p.evidence?.activities ?? 0,
      waitingSince: null,
      searchText: [meaning, p.proposed_slug, p.path, PICTURE_LINK_TEXT].join(" "),
      bulkSafe: false,
      familyId: null,
      data: { type: "picture", proposal: p },
    });
  }
  return out;
}
