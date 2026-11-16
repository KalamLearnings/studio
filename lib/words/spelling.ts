/**
 * The spelling preview before a word is created (content model CM-S1, design
 * 2.6, review F7 and F22). The backend's `saveWord` (CM-B2) never creates a
 * twin: it reuses the row whose `arabic` is exactly the text, else the oldest
 * row with the same normalised spelling (`spelling_key`), and creates a row
 * only on a miss, stored as the normalised spelling. This module predicts that
 * outcome from the loaded word library, with the backend's own normaliser
 * (`normaliseSpelling`, a synced copy in `@kalam/curriculum-schemas`), so the
 * author sees "this will use the existing word X" instead of a silent twin.
 *
 * `/words` does not return `spelling_key`; the key of a row is
 * `spellingKey(row.arabic)`, the same rule the backend's backfill writes.
 *
 * It also turns the backend's `WORD_SPELLING_INVALID` refusal into plain lines.
 */

import { normaliseSpelling, spellingKey, type SpellingIssue } from "@kalam/curriculum-schemas";

export const WORD_SPELLING_INVALID = "WORD_SPELLING_INVALID";
/** The backend refuses a new word that is one letter (CM-B10c, 400). */
export const WORD_IS_A_LETTER = "WORD_IS_A_LETTER";
export const WORD_IS_A_LETTER_MESSAGE = "This is a single letter. Letters live in the alphabet, not the word bank.";
/** The backend refuses a new word or spelling on its reviewed harmful-word list (CM-P1, 400). */
export const HARMFUL_WORD = "HARMFUL_WORD";
export const HARMFUL_WORD_MESSAGE =
  "This word is on the blocked word list: it reads as a vulgar word in Arabic. Use a different word.";

/** The fields of a library row the preview reads. */
export interface SpellingWord {
  id: string;
  arabic: string;
  created_at?: string | null;
}

export type SpellingPreview<W extends SpellingWord> =
  /** The text is a library row as typed: nothing is created. */
  | { kind: "exact"; spelling: string; word: W }
  /** Another row has the same normalised spelling: the save uses it. */
  | { kind: "reuse"; spelling: string; word: W }
  /** No row: the save creates one, stored as `spelling`. */
  | { kind: "new"; spelling: string; changed: boolean }
  /** Not a valid spelling: the library will not take it. */
  | { kind: "invalid"; spelling: string; issues: SpellingIssue[] };

/** Oldest first, then by id: the order `saveWord` picks among twins. */
function byAge(a: SpellingWord, b: SpellingWord): number {
  return (a.created_at ?? "￿").localeCompare(b.created_at ?? "￿") || a.id.localeCompare(b.id);
}

/** What saving `text` would do to the library; null for an empty field. */
export function previewWordSpelling<W extends SpellingWord>(
  text: string,
  words: readonly W[],
): SpellingPreview<W> | null {
  if (!text.trim()) return null;
  const result = normaliseSpelling(text);
  const exact = words.find((w) => w.arabic === text);
  if (exact) return { kind: "exact", spelling: result.spelling, word: exact };
  if (!result.ok) return { kind: "invalid", spelling: result.spelling, issues: result.issues };
  const twins = words.filter((w) => spellingKey(w.arabic) === result.spelling).sort(byAge);
  if (twins[0]) return { kind: "reuse", spelling: result.spelling, word: twins[0] };
  return { kind: "new", spelling: result.spelling, changed: result.spelling !== text };
}

/** How a character is named in a message: the character and its code point. */
function describeChar(ch: string): string {
  const cp = `U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`;
  if (/\s/.test(ch)) return `A space (${cp})`;
  return `"${ch}" (${cp})`;
}

/** One spelling issue in plain words, naming the character it is about. */
export function plainSpellingIssue(issue: SpellingIssue, spelling: string): string {
  switch (issue.code) {
    case "empty":
      return "The word is empty.";
    case "mark_without_letter":
      return "The word starts with a haraka that has no letter.";
    case "invalid_character": {
      const ch = issue.index !== undefined ? Array.from(spelling)[issue.index] : undefined;
      return ch
        ? `${describeChar(ch)} is not an Arabic letter or haraka.`
        : issue.message;
    }
    default:
      return issue.message;
  }
}

function isIssue(v: unknown): v is SpellingIssue {
  return !!v && typeof v === "object" && typeof (v as SpellingIssue).code === "string" &&
    typeof (v as SpellingIssue).message === "string";
}

export interface WordSpellingError {
  /** The text the server was given. */
  arabic: string | null;
  /** Its normalised spelling. */
  spelling: string | null;
  /** The issues in plain words, one line each. */
  messages: string[];
}

/**
 * The parts of a `WORD_SPELLING_INVALID` refusal (400, details
 * `{ arabic, spelling, issues }`), a `WORD_IS_A_LETTER` refusal or a `HARMFUL_WORD` refusal (its
 * message names the word); null when the error is something else.
 */
export function parseWordSpellingError(
  error: { code?: string; details?: unknown; message?: string } | null | undefined,
): WordSpellingError | null {
  if (error?.code === HARMFUL_WORD) {
    const d = (error.details && typeof error.details === "object" ? error.details : {}) as { arabic?: unknown };
    const message = typeof error.message === "string" && error.message.includes("blocked word list")
      ? error.message
      : HARMFUL_WORD_MESSAGE;
    return { arabic: typeof d.arabic === "string" ? d.arabic : null, spelling: null, messages: [message] };
  }
  if (error?.code === WORD_IS_A_LETTER) {
    const d = (error.details && typeof error.details === "object" ? error.details : {}) as { arabic?: unknown };
    return { arabic: typeof d.arabic === "string" ? d.arabic : null, spelling: null, messages: [WORD_IS_A_LETTER_MESSAGE] };
  }
  if (!error || error.code !== WORD_SPELLING_INVALID) return null;
  const d = (error.details && typeof error.details === "object" ? error.details : {}) as {
    arabic?: unknown;
    spelling?: unknown;
    issues?: unknown;
  };
  const arabic = typeof d.arabic === "string" ? d.arabic : null;
  const spelling = typeof d.spelling === "string" ? d.spelling : null;
  const issues = Array.isArray(d.issues) ? d.issues.filter(isIssue) : [];
  const messages = issues.map((i) => plainSpellingIssue(i, spelling ?? ""));
  return { arabic, spelling, messages: messages.length ? messages : ["The word is not a valid Arabic spelling."] };
}
