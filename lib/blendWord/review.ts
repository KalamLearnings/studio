/**
 * The blend review queue (SB-S4, TECH-DESIGN 3.4): the backend's
 * `GET /words/blend/review` read arranged for the `/review/blend` page, and
 * the one-word read `GET /words/:wordId/blend` for the word editor's audio
 * section. Filters, QA flags and pseudo-word proposals in plain words, the
 * override diff, and the split review's request body.
 *
 * The shapes mirror `BlendReviewWord` / `BlendReviewForm` of the backend's
 * core/application/words/list-blend-review.ts, `WordBlendView` of
 * get-word-blend.ts and `BlendQaFlag` of core/domain/blend/blend-qa.ts. Pure.
 */

import { checkBlendUnits, splitBlendWord, type BlendUnitKind, type BlendUnitTag } from "@kalam/curriculum-schemas";
import type { BlendEnding } from "./config";
import { describeTags, plainIssue, type BlendFormPreview } from "./preview";
import { anyPending, type BlendReviewTake, type TakeStatus } from "./takes";

// ---------------------------------------------------------------------------
// Shapes (the backend's)
// ---------------------------------------------------------------------------

export type BlendQaFlagCode =
  | "initial_shadda"
  | "sukoon_run"
  | "tanween_not_final"
  | "fathatan_without_seat"
  | "madd_after_wrong_vowel"
  | "conflicting_marks"
  | "likely_pseudo"
  | "override_differs"
  | "splitter_warning"
  | "ai_suspicious_marks"
  | "ai_likely_pseudo";

export interface BlendQaFlag {
  code: BlendQaFlagCode | string;
  source: "rule" | "ai";
  severity: "review" | "note";
  message: string;
  letter?: number;
  unit?: number;
  detail?: string;
  confidence?: number;
  suggestion?: string;
}

/** A stored unit, as much of it as the page reads. */
export interface ReviewUnit {
  id?: string;
  text: string;
  kind?: BlendUnitKind;
  tags: BlendUnitTag[];
}

export type HarakatSource = "author" | "suggested_confirmed";

export interface BlendReviewForm {
  form: BlendEnding;
  vowelisedText: string;
  units: ReviewUnit[];
  splitterVersion: string;
  override: boolean;
  reviewStatus: "ready" | "needs_review";
  harakatSource: HarakatSource;
  qaFlags: BlendQaFlag[];
  aiCheckedAt: string | null;
  review: { decision: "approved" | "rejected"; by: string | null; at: string | null; note: string | null; current: boolean } | null;
  takes: BlendReviewTake[];
}

export interface BlendReviewWord {
  wordId: string;
  word: { arabic: string; english: string | null; isPseudo: boolean; usageCount: number } | null;
  forms: BlendReviewForm[];
}

export interface BlendReviewList {
  items: BlendReviewWord[];
}

/** `GET /words/:wordId/blend`: one saved word and every stored form, whether or not anything waits for review. */
export interface WordBlend {
  wordId: string;
  text: string;
  meaning: string | null;
  isPseudo: boolean;
  /** Pausal first; empty when no split is stored. */
  forms: BlendReviewForm[];
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export type ReviewFilter = "all" | "needs_review" | "failed" | "not_voiceable";

export const REVIEW_FILTERS: { value: ReviewFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "needs_review", label: "Needs review" },
  { value: "failed", label: "Takes failed" },
  { value: "not_voiceable", label: "Not voiceable" },
];

const hasTake = (form: BlendReviewForm, status: TakeStatus) => form.takes.some((t) => t.current && t.status === status);

/** The word matches the filter: a split or a take waiting, a failed take, a take not voiceable. */
export function matchesFilter(word: BlendReviewWord, filter: ReviewFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "needs_review":
      return word.forms.some((f) => f.reviewStatus === "needs_review" || hasTake(f, "needs_review"));
    case "failed":
      return word.forms.some((f) => hasTake(f, "failed"));
    case "not_voiceable":
      return word.forms.some((f) => hasTake(f, "not_voiceable"));
  }
}

export function filterQueue(items: readonly BlendReviewWord[], filter: ReviewFilter): BlendReviewWord[] {
  return items.filter((w) => matchesFilter(w, filter));
}

export function filterCounts(items: readonly BlendReviewWord[]): Record<ReviewFilter, number> {
  return {
    all: items.length,
    needs_review: filterQueue(items, "needs_review").length,
    failed: filterQueue(items, "failed").length,
    not_voiceable: filterQueue(items, "not_voiceable").length,
  };
}

/** The forms in reading order: pausal, then full. */
export function sortedForms(word: BlendReviewWord): BlendReviewForm[] {
  const order: Record<BlendEnding, number> = { pausal: 0, full: 1 };
  return [...word.forms].sort((a, b) => order[a.form] - order[b.form]);
}

// ---------------------------------------------------------------------------
// One word (the word editor's audio section)
// ---------------------------------------------------------------------------

/** The stored form of the word, or null when the backend has no split for it. */
export function wordBlendForm(blend: WordBlend | null | undefined, form: BlendEnding): BlendReviewForm | null {
  if (!blend || !Array.isArray(blend.forms)) return null;
  return blend.forms.find((f) => f.form === form) ?? null;
}

/** True while a take of any form is being made: the editor reads the word again until none is. */
export function wordBlendPending(blend: WordBlend | null | undefined): boolean {
  return !!blend && Array.isArray(blend.forms) && blend.forms.some((f) => anyPending(f.takes));
}

/** Which saved word the audio belongs to, in a line: its text, meaning and whether it is a practice word. */
export function savedWordLine(blend: WordBlend): string {
  const meaning = blend.meaning?.trim() ? ` (${blend.meaning.trim()})` : "";
  const pseudo = blend.isPseudo ? ", a practice word" : "";
  return `Audio of the saved word ${blend.text}${meaning}${pseudo}.`;
}

// ---------------------------------------------------------------------------
// The split as stored, and the override diff
// ---------------------------------------------------------------------------

/**
 * A stored form as `BlendFormColumn` shows it: the stored units (the
 * override, when there is one) and, for an override, the hard-rule issues.
 */
export function reviewFormPreview(form: BlendReviewForm): BlendFormPreview {
  const split = splitBlendWord(form.vowelisedText, form.form);
  const units = form.units.map((u, i) => ({
    id: u.id ?? `u${i}`,
    text: u.text,
    kind: u.kind ?? null,
    tags: describeTags(u.tags ?? []),
  }));
  const raw = form.override ? checkBlendUnits(split.text, form.units) : [];
  return {
    form: form.form,
    text: split.text,
    split,
    units,
    issues: raw.map((i) => plainIssue(i, split, form.units)),
    ok: !raw.some((i) => i.severity === "error"),
    overridden: form.override,
  };
}

export interface OverrideDiff {
  /** The splitter's units, or null when it rejects the word. */
  splitter: string[] | null;
  stored: string[];
  /** Per stored unit: it is not one of the splitter's units at the same place. */
  changed: boolean[];
}

/** How an override differs from the shared splitter's split; null for no override. */
export function overrideDiff(form: BlendReviewForm): OverrideDiff | null {
  if (!form.override) return null;
  const split = splitBlendWord(form.vowelisedText, form.form);
  const splitter = split.ok ? split.units.map((u) => u.text) : null;
  const stored = form.units.map((u) => u.text);
  return { splitter, stored, changed: stored.map((t, i) => !splitter || splitter[i] !== t) };
}

// ---------------------------------------------------------------------------
// QA flags in plain words
// ---------------------------------------------------------------------------

const FLAG_LABELS: Record<string, string> = {
  initial_shadda: "Shadda on the first letter",
  sukoon_run: "Two sukoons in a row",
  tanween_not_final: "Tanween not on the last letter",
  fathatan_without_seat: "Fathatan without its alif",
  madd_after_wrong_vowel: "Long vowel after the wrong short vowel",
  conflicting_marks: "Marks that conflict",
  likely_pseudo: "May be a practice word",
  override_differs: "The edited split differs from the rules",
  splitter_warning: "Splitter note",
  ai_suspicious_marks: "AI: the marks look wrong",
  ai_likely_pseudo: "AI: may be a practice word",
};

const PSEUDO_REASONS: Record<string, string> = {
  adjacent_hamzas: "two hamzas in a row",
  repeated_letter: "one letter repeated",
  short_without_meaning: "a very short word with no meaning in the library",
};

export interface FlagView {
  title: string;
  message: string;
  /** "Rule" or "AI, 80% sure". */
  source: string;
  /** Needs a person, or only a note. */
  blocking: boolean;
  /** The AI's expected reading, for the reviewer. */
  suggestion: string | null;
}

function capitalise(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** One QA flag of a split in plain words, with the unit it is about. */
export function qaFlagView(flag: BlendQaFlag, units?: readonly { text: string }[]): FlagView {
  const unit = typeof flag.unit === "number" && units?.[flag.unit] ? ` (syllable "${units[flag.unit].text}")` : "";
  let message = capitalise(flag.message?.trim() ?? "") + unit;
  if (flag.code === "likely_pseudo" && flag.detail) {
    const reasons = flag.detail.split(",").map((r) => PSEUDO_REASONS[r.trim()] ?? r.trim()).filter(Boolean);
    if (reasons.length) message += `. Why: ${reasons.join("; ")}`;
  }
  if (flag.code === "override_differs" && flag.detail === "splitter_rejects") {
    message = "The rules cannot split this word; the edited split is the only one.";
  }
  const confidence = typeof flag.confidence === "number" ? `, ${Math.round(Math.min(1, Math.max(0, flag.confidence)) * 100)}% sure` : "";
  return {
    title: FLAG_LABELS[flag.code] ?? capitalise(String(flag.code).replace(/_/g, " ")),
    message: message ? (/[.!?]$/.test(message) ? message : `${message}.`) : "",
    source: flag.source === "ai" ? `AI${confidence}` : "Rule",
    blocking: flag.severity === "review",
    suggestion: flag.suggestion?.trim() || null,
  };
}

export interface PseudoProposal {
  source: string;
  message: string;
}

/**
 * The pseudo-word proposals of a word, from the flags of its forms (one per
 * source), or none when the word is already marked as a practice word.
 */
export function pseudoProposals(word: BlendReviewWord): PseudoProposal[] {
  if (word.word?.isPseudo) return [];
  const seen = new Set<string>();
  const out: PseudoProposal[] = [];
  for (const form of word.forms) {
    for (const flag of form.qaFlags ?? []) {
      if (flag.code !== "likely_pseudo" && flag.code !== "ai_likely_pseudo") continue;
      if (seen.has(flag.code)) continue;
      seen.add(flag.code);
      const view = qaFlagView(flag);
      out.push({ source: view.source, message: view.message });
    }
  }
  return out;
}

export const HARAKAT_SOURCE_LABELS: Record<HarakatSource, string> = {
  author: "Typed by the author",
  suggested_confirmed: "Suggested, confirmed by the author",
};

export function harakatSourceLabel(source: string | null | undefined): string {
  return HARAKAT_SOURCE_LABELS[source as HarakatSource] ?? "Unknown";
}

// ---------------------------------------------------------------------------
// Split review
// ---------------------------------------------------------------------------

export type SplitReviewBody = { decision: "approved"; note?: string } | { decision: "rejected"; note: string };

/** The split review body, checked as the backend checks it: a rejection needs a note; at most 500 characters. */
export function splitReviewBody(
  decision: "approved" | "rejected",
  note: string,
): { ok: true; body: SplitReviewBody } | { ok: false; error: string } {
  const n = note.trim();
  if (n.length > 500) return { ok: false, error: "The note may be at most 500 characters." };
  if (decision === "rejected") {
    return n ? { ok: true, body: { decision, note: n } } : { ok: false, error: "Say why the split is wrong in the note." };
  }
  return { ok: true, body: n ? { decision, note: n } : { decision } };
}

/** The split's review state in a line. */
export function splitReviewLine(form: BlendReviewForm): string {
  const r = form.review;
  if (!r) return form.reviewStatus === "needs_review" ? "The split waits for review." : "The split is ready.";
  const what = r.decision === "approved" ? "Approved" : "Rejected";
  const note = r.note ? `: ${r.note}` : "";
  const stale = r.current ? "" : " The split or its flags changed since, so it needs review again.";
  return `${what}${note}.${stale}`;
}

// ---------------------------------------------------------------------------
// AI check
// ---------------------------------------------------------------------------

export interface AiCheckItem {
  wordId: string;
  text: string | null;
  status: "flagged" | "clear" | "no_answer" | "missing_word";
  forms: string[];
  flags: BlendQaFlag[];
}

export interface AiCheckResult {
  estimate: unknown;
  items: AiCheckItem[];
}

/** The AI check's result in one line. */
export function aiCheckSummary(result: AiCheckResult | null | undefined): string {
  const items = Array.isArray(result?.items) ? result.items : [];
  if (items.length === 0) return "There was nothing to check.";
  const count = (s: AiCheckItem["status"]) => items.filter((i) => i.status === s).length;
  const parts = [
    `${count("flagged")} flagged`,
    `${count("clear")} clear`,
    ...(count("no_answer") ? [`${count("no_answer")} with no answer`] : []),
    ...(count("missing_word") ? [`${count("missing_word")} missing from the library`] : []),
  ];
  return `Checked ${items.length} word${items.length === 1 ? "" : "s"}: ${parts.join(", ")}.`;
}

/** The AI check's refusal in plain words; `disable` keeps the button off with this reason. */
export function aiCheckErrorView(error: unknown): { message: string; disable: boolean } {
  const e = (error ?? {}) as { code?: string; status?: number; message?: string };
  if (e.code === "SPEND_DISABLED" || (e.status === 503 && e.code !== "SPEND_BUDGET_EXCEEDED")) {
    return { message: "The AI check is turned off.", disable: true };
  }
  if (e.code === "SPEND_BUDGET_EXCEEDED") return { message: "This month's budget for the AI check is used up.", disable: true };
  if (e.code === "PROVIDER_RATE_LIMITED" || e.status === 429) {
    return { message: "The AI service is busy. Wait a moment and try again.", disable: false };
  }
  if (e.status === 403) return { message: "Only staff can run the AI check.", disable: true };
  return { message: "The AI check did not run. Try again.", disable: false };
}

/** The words the batch checks: the listed words, at most 50 (the backend's cap). */
export function aiCheckWordIds(items: readonly BlendReviewWord[]): string[] {
  return items.map((w) => w.wordId).slice(0, 50);
}

/** Why the word editor shows no audio controls, or null when it can show them. */
export function audioUnavailableReason(wordId: string | null | undefined, edited: boolean): string | null {
  if (!wordId) return "Save the activity first. Audio is made for a word in the library.";
  if (edited) return "The audio below is for the saved word. Save the activity to make audio for your changes.";
  return null;
}
