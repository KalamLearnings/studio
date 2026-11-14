/**
 * Harakat suggestions in the word editor (SB-S2, TECH-DESIGN 3.2).
 *
 * The backend's `POST /words/suggest-harakat` (SB-B8) proposes the full
 * vowelised form of a word and checks each reading with the splitter. Nothing
 * here applies a suggestion: the author picks one and presses Confirm, and
 * only then does the word change (`confirmHarakatSuggestion`).
 *
 * The response shapes mirror the backend's `HarakatSuggestionItem` and
 * `HarakatCandidate` (core/application/words/suggest-harakat.ts,
 * core/domain/blend/harakat-suggestion.ts). They are parsed defensively: a
 * malformed answer is treated as no suggestion.
 *
 * NOT SENT: the backend defers `harakat_source = 'suggested_confirmed'` on
 * save, and the SB-B3 save contract (core/contracts/sound-blend-save.ts) has no
 * field for it (`wordBlendEdit` is strict). A confirmed suggestion saves as an
 * ordinary new word text until a backend ticket adds that field.
 */

import { normaliseBlendText, splitBlendWord, type BlendForm, type BlendIssue } from "@kalam/curriculum-schemas";
import { sourceWordText, wordEditOf, type BlendEnding, type SoundBlendConfig } from "./config";
import { changePseudo, changeWord } from "./editor";
import { buildWordPreview, type BlendFormPreview, type PlainIssue, type WordPreview } from "./preview";

// ---------------------------------------------------------------------------
// Response shapes (the backend's)
// ---------------------------------------------------------------------------

export type HarakatSuggestionStatus = "complete" | "suggested" | "no_valid_suggestion";
export type HarakatFlag = "letters_changed" | "marks_changed" | "split_invalid" | "no_full_ending";

export interface HarakatCandidate {
  /** The full form, normalised. */
  text: string;
  /** Derived by rule from `text`. */
  pausal: string;
  confidence: number;
  /** No blocking flag: the author may confirm it. */
  valid: boolean;
  flags: HarakatFlag[];
  issues: { form: BlendForm; issues: BlendIssue[] }[];
}

export interface HarakatSuggestionItem {
  text: string;
  status: HarakatSuggestionStatus;
  suggestion: HarakatCandidate | null;
  alternatives: HarakatCandidate[];
}

export interface SuggestHarakatResponse {
  items: HarakatSuggestionItem[];
}

/** The request body. The backend takes 1 to 20 texts; the editor sends one. */
export function suggestHarakatRequest(text: string): { texts: string[] } {
  return { texts: [normaliseBlendText(text)] };
}

// ---------------------------------------------------------------------------
// When to offer it
// ---------------------------------------------------------------------------

/** Splitter issues that mean marks are missing from the typed word. */
const MISSING_MARK_CODES = new Set(["missing_haraka", "inferred_sukoon"]);

/**
 * Why the editor offers "Suggest harakat", or null when it does not: the
 * splitter reports a letter without its marks, or the word is known only in
 * its pausal form while the activity uses the full ending.
 */
export function harakatSuggestionReason(preview: WordPreview | null, ending: BlendEnding): string | null {
  if (!preview || !preview.full.text) return null;
  const missing = [preview.full, preview.pausal].some((form) =>
    form.split.issues.some((issue) => MISSING_MARK_CODES.has(issue.code)),
  );
  if (missing) return "Some letters have no haraka.";
  if (!preview.fullKnown && ending === "full") {
    return "This activity uses the full ending, but the word has no case ending or tanween.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Response -> what the editor shows
// ---------------------------------------------------------------------------

export interface MarkedLetter {
  letter: string;
  marks: string;
  /** The suggestion adds or changes a mark on this letter. */
  changed: boolean;
}

export interface HarakatOption {
  text: string;
  pausal: string;
  /** 0 to 100. */
  confidencePercent: number;
  /** The author may confirm it (no blocking flag). */
  valid: boolean;
  /** The backend's best valid reading. */
  best: boolean;
  /** The full form's letters, with the changed ones marked. */
  letters: MarkedLetter[];
  /** The split of the activity's ending form, by the shared splitter. */
  split: BlendFormPreview;
  /** Plain-word reasons it was flagged, and splitter issues. */
  problems: PlainIssue[];
}

export type HarakatOffer =
  | { kind: "complete"; requestedText: string }
  | { kind: "options"; requestedText: string; options: HarakatOption[] }
  | { kind: "none"; requestedText: string; options: HarakatOption[] };

export const FLAG_MESSAGES: Record<HarakatFlag, string> = {
  letters_changed: "It changes the letters of the word.",
  marks_changed: "It removes or replaces a mark you typed.",
  split_invalid: "The syllable rules reject it.",
  no_full_ending: "It has no case ending or tanween.",
};

function lettersOf(text: string): { letter: string; marks: string }[] {
  return splitBlendWord(text, "full").letters.map((l) => ({ letter: l.letter, marks: l.marks }));
}

function sameMarks(a: string, b: string): boolean {
  return Array.from(a).sort().join("") === Array.from(b).sort().join("");
}

/**
 * The suggestion's letters, each marked when its marks differ from what the
 * author typed. When the letters themselves differ every letter is marked.
 */
export function markChangedLetters(typedText: string, suggestedText: string): MarkedLetter[] {
  const typed = lettersOf(normaliseBlendText(typedText));
  const suggested = lettersOf(normaliseBlendText(suggestedText));
  const sameLetters =
    typed.length === suggested.length && typed.every((t, i) => t.letter === suggested[i].letter);
  return suggested.map((s, i) => ({
    letter: s.letter,
    marks: s.marks,
    changed: !sameLetters || !sameMarks(typed[i].marks, s.marks),
  }));
}

function isCandidate(v: unknown): v is HarakatCandidate {
  if (!v || typeof v !== "object") return false;
  const c = v as Partial<HarakatCandidate>;
  return typeof c.text === "string" && c.text.length > 0 && typeof c.valid === "boolean";
}

function toOption(typedText: string, candidate: HarakatCandidate, ending: BlendEnding, best: boolean): HarakatOption {
  const preview = buildWordPreview(candidate.text);
  const split = preview[ending];
  const flags = Array.isArray(candidate.flags) ? candidate.flags : [];
  const problems: PlainIssue[] = flags
    .filter((f) => f !== "no_full_ending" || ending === "full")
    .map((f) => ({
      severity: f === "no_full_ending" ? ("warning" as const) : ("error" as const),
      message: FLAG_MESSAGES[f] ?? f,
    }));
  for (const issue of split.issues) {
    if (!problems.some((p) => p.message === issue.message)) problems.push(issue);
  }
  const confidence = typeof candidate.confidence === "number" ? candidate.confidence : 0;
  return {
    text: candidate.text,
    pausal: typeof candidate.pausal === "string" ? candidate.pausal : preview.pausal.text,
    confidencePercent: Math.round(Math.min(1, Math.max(0, confidence)) * 100),
    valid: candidate.valid,
    best,
    letters: markChangedLetters(typedText, candidate.text),
    split,
    problems,
  };
}

/**
 * What to show for the editor's word, from the endpoint's response. Null when
 * the response has no item for it.
 */
export function toHarakatOffer(
  response: SuggestHarakatResponse | null | undefined,
  typedText: string,
  ending: BlendEnding,
): HarakatOffer | null {
  const requestedText = normaliseBlendText(typedText);
  const items = Array.isArray(response?.items) ? response.items : [];
  const item = items.find((i) => i && i.text === requestedText) ?? (items.length === 1 ? items[0] : undefined);
  if (!item) return null;
  if (item.status === "complete") return { kind: "complete", requestedText };

  const alternatives = (Array.isArray(item.alternatives) ? item.alternatives : []).filter(isCandidate);
  const suggestion = item.status === "suggested" && isCandidate(item.suggestion) && item.suggestion.valid
    ? item.suggestion
    : null;
  const options = [
    ...(suggestion ? [toOption(typedText, suggestion, ending, true)] : []),
    ...alternatives.map((c) => toOption(typedText, c, ending, false)),
  ];
  return suggestion
    ? { kind: "options", requestedText, options }
    : { kind: "none", requestedText, options };
}

/** The offer still belongs to the word in the editor (the author did not retype it). */
export function offerMatchesWord(offer: HarakatOffer | null, currentText: string): boolean {
  return !!offer && offer.requestedText === normaliseBlendText(currentText);
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export interface HarakatErrorView {
  message: string;
  /** Show a "Try again" action. */
  retry: boolean;
  /** Disable "Suggest harakat" with this message as the reason. */
  disable: boolean;
}

/** The endpoint's refusal in plain words. */
export function harakatErrorView(error: unknown): HarakatErrorView {
  const e = (error ?? {}) as { code?: string; status?: number; message?: string };
  switch (e.code) {
    case "SPEND_DISABLED":
      return { message: "Harakat suggestions are turned off.", retry: false, disable: true };
    case "SPEND_BUDGET_EXCEEDED":
      return {
        message: "This month's budget for harakat suggestions is used up. Add the marks by hand.",
        retry: false,
        disable: true,
      };
    case "PROVIDER_RATE_LIMITED":
      return {
        message: "The suggestion service is busy. Wait a moment and try again.",
        retry: true,
        disable: false,
      };
  }
  if (e.status === 403) return { message: "Only staff can ask for harakat suggestions.", retry: false, disable: true };
  if (e.status === 400) {
    return { message: "The word cannot be sent: it must be one Arabic word of at most 40 characters.", retry: false, disable: false };
  }
  return { message: "The suggestion could not be loaded. Try again.", retry: true, disable: false };
}

export const NO_VALID_SUGGESTION_MESSAGE =
  "No reading passed the checks. Add the marks by hand. Any flagged readings are listed below.";
export const COMPLETE_MESSAGE = "The word already has all its harakat. Nothing to suggest.";

// ---------------------------------------------------------------------------
// Confirm
// ---------------------------------------------------------------------------

/**
 * Applies a confirmed reading: its full form becomes the word's text, sent as
 * `wordRef.text` without a `wordId` (as SB-S1's "Use as the word"), so the
 * server resolves or creates the library word and splits it on save. The
 * pseudo-word flag is kept; any override is dropped (it was for the old text).
 */
export function confirmHarakatSuggestion(config: SoundBlendConfig, fullText: string): SoundBlendConfig {
  const text = normaliseBlendText(fullText);
  if (!text || text === normaliseBlendText(sourceWordText(config))) return config;
  const wasPseudo = !!wordEditOf(config)?.isPseudo;
  const next = changeWord(config, text);
  return wasPseudo ? changePseudo(next, true) : next;
}
