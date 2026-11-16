/**
 * Drafted content (`GET /words/content-drafts`, CM-DRAFTS) as Review items.
 * Pure.
 *
 * - A drafted meaning (`meaning`): "Draft meaning", titled by the spelling.
 *   Bulk-safe only when the draft is high confidence, its spelling is a real
 *   word in the bank, and approving would not replace a meaning the word
 *   already has (a replacement is read one at a time).
 * - A drafted picture label (`label`): "Draft picture label". Never bulk: a
 *   person looks at each picture.
 *
 * The backend says when a draft is applied already (`applied`), and then the
 * item shows as decided. It stores no skip: Studio keeps the skipped drafts
 * per reviewer (`lib/review/skippedLinks.ts`, scope `drafts`); they show as
 * Skipped under Decided, where "Show it again" brings them back.
 */

import type { MeaningDraft, PictureLabelDraft } from "../../api/contentDrafts";
import type { InboxItem, ItemState } from "../inbox";
import { isolate } from "./words";

export type MeaningItem = InboxItem<"meaning", { draft: MeaningDraft }>;
export type LabelItem = InboxItem<"label", { draft: PictureLabelDraft }>;
export type DraftItem = MeaningItem | LabelItem;

export const MEANING_DRAFT_TEXT = "Drafted English meaning";
export const LABEL_DRAFT_TEXT = "Drafted picture label";

export const CONFIDENCE_TEXT: Record<MeaningDraft["confidence"], string> = {
  high: "high confidence",
  medium: "medium confidence",
  low: "low confidence",
};

/** Bulk approve: a high-confidence meaning of a real word that has no meaning yet. */
export function meaningBulkSafe(d: MeaningDraft): boolean {
  return d.confidence === "high" && !!d.word && !d.word.is_pseudo && !d.applied && !d.family?.gloss_en?.trim();
}

export interface DraftMarks {
  /** Item keys (`meaning:<word id>`, `label:<asset id>`) skipped in this browser. */
  skipped: ReadonlySet<string>;
}

const stateOf = (key: string, applied: boolean, marks: DraftMarks): ItemState =>
  marks.skipped.has(key) ? "rejected" : applied ? "approved" : "todo";

export function meaningItems(drafts: readonly MeaningDraft[], marks: DraftMarks): MeaningItem[] {
  return drafts.map((d) => {
    const key = `meaning:${d.word_id}`;
    const where = d.family
      ? d.family.gloss_en?.trim()
        ? `, replaces "${d.family.gloss_en}"`
        : `, for the word ${d.family.id}`
      : ", starts a new word";
    return {
      key,
      kind: "meaning",
      id: d.word_id,
      title: d.word?.arabic ?? d.drafted_arabic ?? d.word_id,
      titleScript: d.word || d.drafted_arabic ? "ar" : "latin",
      state: stateOf(key, d.applied, marks),
      context: `"${d.gloss_en}"${d.part_of_speech ? ` (${d.part_of_speech})` : ""}, ${CONFIDENCE_TEXT[d.confidence]}${where}`,
      usage: d.usage_count ?? 0,
      waitingSince: d.created_at,
      searchText: [d.gloss_en, d.part_of_speech, d.family?.id, d.family?.gloss_en, d.note, d.confidence, MEANING_DRAFT_TEXT]
        .filter(Boolean)
        .join(" "),
      bulkSafe: meaningBulkSafe(d),
      familyId: d.family?.id ?? null,
      data: { draft: d },
    };
  });
}

export function labelItems(drafts: readonly PictureLabelDraft[], marks: DraftMarks): LabelItem[] {
  return drafts.map((d) => {
    const key = `label:${d.asset_id}`;
    const word = d.word?.arabic ?? d.arabic;
    return {
      key,
      kind: "label",
      id: d.asset_id,
      title: d.concept_en,
      titleScript: "latin",
      state: stateOf(key, d.applied, marks),
      context: `${LABEL_DRAFT_TEXT}: ${d.concept_en}${word ? `, ${isolate(word)}` : d.needs_word ? ", no word yet" : ""}, ${CONFIDENCE_TEXT[d.confidence]}${d.concept ? "" : " (a new meaning)"}`,
      usage: 0,
      waitingSince: d.created_at,
      searchText: [d.concept_en, d.concept_slug, word, d.path, d.note, d.confidence, LABEL_DRAFT_TEXT].filter(Boolean).join(" "),
      bulkSafe: false,
      familyId: d.family?.id ?? null,
      data: { draft: d },
    };
  });
}
