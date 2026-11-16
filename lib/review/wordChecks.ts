/**
 * Automatic word checks in the Spelling pane (CM-AIPRE). Pure.
 *
 * An offline checker (a tashkeel model plus a dictionary, or a language model)
 * says per word whether the stored harakat look right and what it would write.
 * The backend decides which verdicts flag a word (`flagged`); this module only
 * labels them and lines the suggestion up against the stored spelling, letter by
 * letter. A suggestion is advice: the reviewer applies one through the
 * fix-harakat path, or ignores it.
 */

import { letterUnits, skeleton } from "../words/review/arabicText";

export type CheckVerdict = "ok" | "flag_vowels" | "flag_unknown" | "likely_drill";

/** One source's newest verdict on a word (`GET /words/check-suggestions`). */
export interface WordCheck {
  source: string;
  verdict: CheckVerdict;
  suggested_text: string | null;
  note: string | null;
  run_id: string;
  created_at: string;
}

export interface WordCheckSummary {
  word_id: string;
  /** The backend's rule: any source flags it (wrong harakat, or not in the dictionary). */
  flagged: boolean;
  /** Flags first, then by source. */
  checks: WordCheck[];
}

export const VERDICT_TEXT: Record<CheckVerdict, { label: string; tone: "flag" | "pass" | "note" }> = {
  ok: { label: "Looks right", tone: "pass" },
  flag_vowels: { label: "Harakat may be wrong", tone: "flag" },
  flag_unknown: { label: "Not in the dictionary", tone: "flag" },
  likely_drill: { label: "Looks like a practice item", tone: "note" },
};

export function verdictText(verdict: string): { label: string; tone: "flag" | "pass" | "note" } {
  return VERDICT_TEXT[verdict as CheckVerdict] ?? { label: verdict, tone: "note" };
}

/** `catt_camel` and `llm:<model>` in plain words. */
export function sourceLabel(source: string): string {
  if (source === "catt_camel") return "Tashkeel model and dictionary (CATT, CAMeL)";
  if (source.startsWith("llm:")) return `Language model (${source.slice(4)})`;
  return source;
}

/** One letter with its marks as stored and as suggested. */
export interface DiffUnit {
  base: string;
  stored: string;
  suggested: string;
  changed: boolean;
}

/**
 * The suggestion against the stored spelling, letter by letter; null when the
 * letters differ (then only a person can say which spelling is meant).
 */
export function harakatDiff(stored: string, suggested: string): DiffUnit[] | null {
  const a = letterUnits(stored.normalize("NFC"));
  const b = letterUnits(suggested.normalize("NFC"));
  if (a.length !== b.length || a.some((u, i) => u.base !== b[i].base)) return null;
  return a.map((u, i) => {
    const s = sortMarks(u.marks);
    const t = sortMarks(b[i].marks);
    return { base: u.base, stored: u.marks, suggested: b[i].marks, changed: s !== t };
  });
}

const sortMarks = (marks: string) => Array.from(marks).sort().join("");

/**
 * A suggestion the reviewer can take into the fix-harakat field: it has text,
 * the same letters as the stored spelling, and other harakat.
 */
export function canApplySuggestion(stored: string, check: Pick<WordCheck, "suggested_text">): boolean {
  const s = check.suggested_text;
  if (!s) return false;
  if (skeleton(s) !== skeleton(stored)) return false;
  const diff = harakatDiff(stored, s);
  return !!diff && diff.some((u) => u.changed);
}

/** The checks by word id. */
export function checksByWord(summaries: readonly WordCheckSummary[]): Map<string, WordCheckSummary> {
  return new Map(summaries.map((s) => [s.word_id, s]));
}
