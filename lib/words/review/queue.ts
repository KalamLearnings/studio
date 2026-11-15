/**
 * The word-bank review queue (content model CM-S7, S2, D18): the live
 * spellings a native reviewer works through for CM-C3, most used first, each
 * with the classifier's class, cheap flags and a suggested action.
 *
 * The queue is computed here from `GET /words` (the backend serves no class),
 * with a synced copy of the backend classifier, so it matches the audit's
 * `14-word-review-queue.csv` (real_full, real_partial and case_variant rows)
 * and stays current as rows are reviewed. Pure: no network, no storage.
 */

import { skeleton } from "./arabicText";
import { classifyWords, type WordClass } from "./wordClasses";

/** The `GET /words` fields the queue reads. */
export interface QueueWord {
  id: string;
  arabic: string;
  usage_count: number;
  created_at: string | null;
  is_pseudo?: boolean | null;
  family_id?: string | null;
  retired_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

/** The classes a person reviews (the S2 table: vowelled real spellings and case-ending variants). */
export const QUEUE_CLASSES: readonly WordClass[] = ["real_full", "real_partial", "case_variant"];

export type QueueFlag = "two_letters" | "vowel_permutations" | "unused";

export const FLAG_LABELS: Record<QueueFlag, string> = {
  two_letters: "Two consonants",
  vowel_permutations: "Many vowelings of the same letters",
  unused: "No activity uses it",
};

export interface SuggestedAction {
  kind: "approve" | "check_real" | "add_harakat" | "join_base";
  text: string;
}

export interface QueueRow {
  /** 1 = most used; stable for the same bank. */
  rank: number;
  word: QueueWord;
  class: WordClass;
  /** The classifier's reason (`base: X` for a case variant). */
  reason: string | null;
  flags: QueueFlag[];
  /** Other live spellings with the same consonants. */
  skeletonSiblings: number;
  action: SuggestedAction;
  reviewed: boolean;
}

/** Three or more other vowelings of the same letters suggests a drill (audit: `vowel_permutations`). */
const PERMUTATION_THRESHOLD = 3;

export function suggestAction(
  cls: WordClass,
  reason: string | null,
  flags: readonly QueueFlag[],
): SuggestedAction {
  if (cls === "real_partial") {
    return { kind: "add_harakat", text: "Partly vowelled: correct the spelling to carry every haraka, then approve." };
  }
  if (cls === "case_variant") {
    const base = reason?.startsWith("base: ") ? reason.slice(6) : "its base";
    return { kind: "join_base", text: `Case-ending variant of ${base}: approve it if the ending is a real form.` };
  }
  if (flags.includes("vowel_permutations") || flags.includes("two_letters")) {
    return {
      kind: "check_real",
      text: "Check it is a real word and correctly vowelled; if it is a drill, record Not a real word.",
    };
  }
  return { kind: "approve", text: "Approve if it is a real word and correctly vowelled." };
}

/** Live rows only: not retired, not already a drill flagged `is_pseudo`. */
export function buildReviewQueue(words: readonly QueueWord[]): QueueRow[] {
  const live = words.filter((w) => !w.retired_at && !w.is_pseudo);
  const classes = classifyWords(live.map((w) => ({ id: w.id, arabic: w.arabic, created_at: w.created_at })));
  const bySkeleton = new Map<string, number>();
  for (const w of live) {
    const sk = skeleton(w.arabic);
    bySkeleton.set(sk, (bySkeleton.get(sk) ?? 0) + 1);
  }
  const rows: Omit<QueueRow, "rank">[] = [];
  for (const w of live) {
    const c = classes.get(w.id);
    if (!c || !QUEUE_CLASSES.includes(c.class)) continue;
    const siblings = (bySkeleton.get(c.skeleton) ?? 1) - 1;
    const flags: QueueFlag[] = [];
    if (Array.from(c.skeleton).length === 2) flags.push("two_letters");
    if (siblings >= PERMUTATION_THRESHOLD) flags.push("vowel_permutations");
    if (w.usage_count === 0) flags.push("unused");
    rows.push({
      word: w,
      class: c.class,
      reason: c.reason,
      flags,
      skeletonSiblings: siblings,
      action: suggestAction(c.class, c.reason, flags),
      reviewed: !!w.reviewed_at,
    });
  }
  rows.sort(
    (a, b) =>
      b.word.usage_count - a.word.usage_count ||
      (a.word.arabic < b.word.arabic ? -1 : a.word.arabic > b.word.arabic ? 1 : 0) ||
      (a.word.id < b.word.id ? -1 : 1),
  );
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

export type QueueFilter = "todo" | "reviewed" | "all";
export type QueueSlice = "all" | WordClass | QueueFlag;

export interface QueueView {
  status: QueueFilter;
  slice: QueueSlice;
  search: string;
}

export function filterQueue(rows: readonly QueueRow[], view: QueueView): QueueRow[] {
  const q = view.search.trim();
  return rows.filter((r) => {
    if (view.status === "todo" && r.reviewed) return false;
    if (view.status === "reviewed" && !r.reviewed) return false;
    if (view.slice !== "all") {
      const isFlag = (view.slice as string) in FLAG_LABELS;
      if (isFlag ? !r.flags.includes(view.slice as QueueFlag) : r.class !== view.slice) return false;
    }
    return !q || r.word.arabic.includes(q) || r.word.id.includes(q);
  });
}

export function queueCounts(rows: readonly QueueRow[]): Record<QueueFilter, number> {
  const reviewed = rows.filter((r) => r.reviewed).length;
  return { todo: rows.length - reviewed, reviewed, all: rows.length };
}

// ---- the reviewer's notes that need the S2 apply -----------------------------------

/**
 * The backend has no route to flag a word `is_pseudo` or to respell a word an
 * activity uses (`WORD_IN_USE`); those decisions are applied by the S2 apply
 * (CM-D2) from the queue CSV. The reviewer records them here and exports the
 * CSV in that file's columns.
 */
export type NoteDecision = "pseudo" | "wrong";

export interface ReviewNote {
  wordId: string;
  decision: NoteDecision;
  /** Required for `wrong`. */
  correctedSpelling?: string;
}

/** Same columns as `14-word-review-queue.csv` (REVIEW_QUEUE_COLUMNS), so the apply script reads it. */
export const EXPORT_COLUMNS = [
  "rank", "word_id", "arabic", "class", "activities", "as_target", "as_distractor_only", "edges", "suspect",
  "skeleton_siblings", "family_role", "family_headword", "family_members", "gloss_proposed", "decision",
  "gloss_en", "corrected_spelling",
] as const;

function csvField(v: string | number): string {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Rows decided in this session as CSV text. Approved rows export as `real`
 * (what Studio already wrote), noted rows as `pseudo` or `wrong`. `activities`
 * carries the live link count; the columns Studio cannot know stay blank.
 */
export function exportDecisionsCsv(rows: readonly QueueRow[], notes: readonly ReviewNote[]): string {
  const noteById = new Map(notes.map((n) => [n.wordId, n]));
  const lines = [EXPORT_COLUMNS.join(",")];
  for (const r of rows) {
    const note = noteById.get(r.word.id);
    const decision = note ? note.decision : r.reviewed ? "real" : "";
    if (!decision) continue;
    const cells: Record<(typeof EXPORT_COLUMNS)[number], string | number> = {
      rank: r.rank, word_id: r.word.id, arabic: r.word.arabic, class: r.class,
      activities: r.word.usage_count, as_target: "", as_distractor_only: "", edges: "",
      suspect: r.flags.join(" "), skeleton_siblings: r.skeletonSiblings, family_role: "", family_headword: "",
      family_members: "", gloss_proposed: "", decision, gloss_en: "",
      corrected_spelling: note?.decision === "wrong" ? (note.correctedSpelling ?? "") : "",
    };
    lines.push(EXPORT_COLUMNS.map((c) => csvField(cells[c])).join(","));
  }
  return lines.join("\n") + "\n";
}

/** A note is valid when a `wrong` carries a correction with the same consonants (letters never change here). */
export function validateNote(row: QueueRow, note: Omit<ReviewNote, "wordId">): string | null {
  if (note.decision === "pseudo") return null;
  const fix = (note.correctedSpelling ?? "").trim();
  if (!fix) return "Type the corrected spelling.";
  if (fix === row.word.arabic) return "The correction is the same as the current spelling.";
  if (skeleton(fix) !== skeleton(row.word.arabic)) {
    return "A correction only changes the harakat; the letters must stay the same.";
  }
  return null;
}
