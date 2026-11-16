/**
 * Spellings and Readings from `GET /words` (CW-2). Pure.
 *
 * Spellings are the word-bank review queue (`buildReviewQueue`, CM-S7) with
 * the reviewer's shared notes. Readings are the live spellings that still
 * need a reads-as (`awaitsReadsAs`, D5) and are not already in the spelling
 * queue, so no word shows twice.
 */

import type { CuratedWord } from "@/lib/types/wordFamilies";
import { awaitsReadsAs, needsReading, readsAsCandidates } from "../../words/family";
import { skeleton } from "../../words/review/arabicText";
import { buildReviewQueue, FLAG_LABELS, type QueueRow, type QueueWord, type ReviewNote } from "../../words/review/queue";
import type { InboxItem, ItemState } from "../inbox";
import { checksByWord, type WordCheckSummary } from "../wordChecks";

/**
 * A `GET /words` row. The endpoint answers every curation column; the queue's
 * `QueueWord` names only the ones it reads, so the rest are optional here.
 */
export type BankWord = QueueWord & Partial<Pick<CuratedWord, "english" | "reads_as_id">>;

export const CLASS_LABELS: Record<string, string> = {
  real_full: "Fully vowelled",
  real_partial: "Partly vowelled",
  case_variant: "Case-ending variant",
};

export interface SpellingData {
  row: QueueRow;
  note: ReviewNote | null;
  /** How many rows the queue has (the "rank N of M" line). */
  queueSize: number;
  /** The automatic checks of this word (CM-AIPRE), when any checker looked at it. Advice only. */
  check: WordCheckSummary | null;
}

export type SpellingItem = InboxItem<"spelling", SpellingData>;

export interface ReadingData {
  word: BankWord;
  /** Fully vowelled spellings with the same letters, best first (`readsAsCandidates`). */
  candidates: BankWord[];
  /** The confirmed reading, once there is one. */
  readsAs: BankWord | null;
}

export type ReadingItem = InboxItem<"reading", ReadingData>;

function spellingState(row: QueueRow, note: ReviewNote | null): ItemState {
  if (note?.decision === "pseudo") return "noted_pseudo";
  if (note?.decision === "wrong") return "noted_wrong";
  return row.reviewed ? "approved" : "todo";
}

const used = (n: number) => `used by ${n}`;

/** Arabic inside a Latin line, wrapped in Unicode isolates so it never reorders the text around it. */
export const isolate = (ar: string) => `\u2068${ar}\u2069`;

export function spellingItems(
  words: readonly BankWord[],
  notes: readonly ReviewNote[],
  checks: readonly WordCheckSummary[] = [],
): SpellingItem[] {
  const rows = buildReviewQueue(words);
  const noteById = new Map(notes.map((n) => [n.wordId, n]));
  const checkById = checksByWord(checks);
  return rows.map((row) => {
    const w = row.word as BankWord;
    const note = noteById.get(w.id) ?? null;
    const state = spellingState(row, note);
    const flags = row.flags.map((f) => FLAG_LABELS[f]);
    const check = checkById.get(w.id) ?? null;
    const checkFlagged = !!check?.flagged;
    return {
      key: `spelling:${w.id}`,
      kind: "spelling",
      id: w.id,
      title: w.arabic,
      titleScript: "ar",
      state,
      context: [
        CLASS_LABELS[row.class] ?? row.class,
        used(w.usage_count),
        ...(flags.length ? [flags.join(", ")] : []),
        ...(checkFlagged ? ["flagged by check"] : []),
      ].join(" · "),
      usage: w.usage_count,
      waitingSince: w.created_at,
      decidedAt: row.reviewed ? (w.reviewed_at ?? null) : null,
      decidedBy: row.reviewed ? (w.reviewed_by ?? null) : null,
      searchText: [w.english ?? "", w.family_id ?? "", row.reason ?? ""].join(" "),
      // Answer 8: bulk approve only covers unflagged, fully vowelled spellings with no note.
      // A spelling the automatic check flags needs a person to look at it (CM-AIPRE).
      bulkSafe: state === "todo" && row.class === "real_full" && row.flags.length === 0 && !checkFlagged,
      checkFlagged,
      familyId: w.family_id ?? null,
      data: { row, note, queueSize: rows.length, check },
    };
  });
}

/** Rows that look like `CuratedWord` to the family rules (absent columns read as null). */
function asReadsAsRow(w: BankWord) {
  return {
    id: w.id,
    arabic: w.arabic,
    is_pseudo: !!w.is_pseudo,
    family_id: w.family_id ?? null,
    reads_as_id: w.reads_as_id ?? null,
    retired_at: w.retired_at ?? null,
  };
}

export function readingItems(words: readonly BankWord[], spellingIds: ReadonlySet<string>): ReadingItem[] {
  const byId = new Map(words.map((w) => [w.id, w]));
  const pool = words.map(asReadsAsRow);
  const out: ReadingItem[] = [];
  for (const w of words) {
    if (spellingIds.has(w.id)) continue;
    const row = asReadsAsRow(w);
    if (!needsReading(row)) continue;
    const waiting = awaitsReadsAs(row);
    const readsAs = !waiting && row.reads_as_id ? (byId.get(row.reads_as_id) ?? null) : null;
    const candidates = waiting
      ? readsAsCandidates(row, pool).map((c) => byId.get(c.id)).filter((c): c is BankWord => !!c)
      : [];
    const context = waiting
      ? candidates.length
        ? `Read as ${candidates.slice(0, 3).map((c) => isolate(c.arabic)).join(", ")}?`
        : "No vowelled spelling with these letters yet"
      : `Read as ${readsAs ? isolate(readsAs.arabic) : "another spelling"}`;
    out.push({
      key: `reading:${w.id}`,
      kind: "reading",
      id: w.id,
      title: w.arabic,
      titleScript: "ar",
      state: waiting ? "todo" : "approved",
      context: w.family_id ? `${context} · family ${w.family_id}` : context,
      usage: w.usage_count,
      waitingSince: w.created_at,
      searchText: [w.english ?? "", w.family_id ?? "", readsAs?.arabic ?? ""].join(" "),
      bulkSafe: false,
      familyId: w.family_id ?? null,
      data: { word: w, candidates, readsAs },
    });
  }
  return out;
}

/** Spellings and Readings together, with Readings kept clear of the spelling queue. */
export function wordItems(
  words: readonly BankWord[],
  notes: readonly ReviewNote[],
  checks: readonly WordCheckSummary[] = [],
): (SpellingItem | ReadingItem)[] {
  const spellings = spellingItems(words, notes, checks);
  const ids = new Set(spellings.map((s) => s.id));
  return [...spellings, ...readingItems(words, ids)];
}

/** Other live spellings with the same letters (the pane's "Same letters, other spellings" card). */
export function sameLetterSpellings(word: Pick<BankWord, "id" | "arabic">, words: readonly BankWord[]): BankWord[] {
  const key = skeleton(word.arabic);
  return words
    .filter((w) => w.id !== word.id && !w.retired_at && skeleton(w.arabic) === key)
    .sort((a, b) => b.usage_count - a.usage_count || a.arabic.localeCompare(b.arabic));
}
