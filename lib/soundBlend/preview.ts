/**
 * The word editor's preview (SB-S1, TECH-DESIGN 3.1): both ending forms of a
 * word, split by the shared splitter, with rule tags and issues in plain words.
 *
 * No rules live here. The split, the tags and the hard rules all come from
 * `@kalam/curriculum-schemas` (the backend's `blend-word.ts`, copied). This
 * module only arranges the output for display.
 */

import {
  checkBlendUnits,
  normaliseBlendText,
  pausal,
  splitBlendWord,
  type BlendIssue,
  type BlendSplit,
  type BlendUnitKind,
  type BlendUnitTag,
} from "@kalam/curriculum-schemas";
import type { BlendEnding, BlendOverrideUnit, WordBlendEdit } from "./config";

export interface PreviewTag {
  tag: BlendUnitTag;
  label: string;
}

export interface PreviewUnit {
  id: string;
  text: string;
  /** Null for an override unit: the splitter did not make it. */
  kind: BlendUnitKind | "invalid" | null;
  tags: PreviewTag[];
}

export interface PlainIssue {
  severity: "error" | "warning";
  message: string;
}

export interface BlendFormPreview {
  form: BlendEnding;
  /** The exact text this form splits (the pausal text for 'pausal'). */
  text: string;
  /** The splitter's own split, also the base for an override. */
  split: BlendSplit;
  /** The units shown: the override when there is one, else the splitter's. */
  units: PreviewUnit[];
  issues: PlainIssue[];
  /** No error issue. */
  ok: boolean;
  /** The units are the author's override and need review. */
  overridden: boolean;
}

export interface WordPreview {
  pausal: BlendFormPreview;
  full: BlendFormPreview;
  /**
   * The full form is known: the word has a final vowel or tanween. When false
   * the word field holds a pausal or unmarked ending, and the full column
   * offers to switch to the full form (a library word of its own).
   */
  fullKnown: boolean;
  /** Both forms read the same (a word with no final vowel, e.g. قَمَرْ). */
  sameText: boolean;
}

/** An issue as the splitter or the server's save (BLEND_INVALID) reports it. */
export interface IssueLike {
  code: string;
  severity?: "error" | "warning";
  message: string;
  letter?: number;
  unit?: number;
}

// ---------------------------------------------------------------------------
// Plain words
// ---------------------------------------------------------------------------

export const TAG_LABELS: Record<BlendUnitTag, string> = {
  sukoon: "sukoon join",
  shaddaFirst: "shadda split (1st half)",
  shaddaSecond: "shadda split (2nd half)",
  madd: "madd",
  "madd:dagger": "madd (dagger alif)",
  tanween: "tanween (vowel + n)",
  qalqala: "qalqala",
  wasl: "al- (wasl alif)",
  sunLam: "al- (silent lam)",
  seatAlif: "silent seat alif",
};

export function describeTags(tags: readonly BlendUnitTag[]): PreviewTag[] {
  return tags.map((tag) => ({ tag, label: TAG_LABELS[tag] ?? tag }));
}

function letterName(split: Pick<BlendSplit, "letters">, index: number | undefined): string {
  if (index === undefined) return "";
  const l = split.letters[index];
  return l ? ` "${l.letter}${l.marks}" (letter ${index + 1})` : ` (letter ${index + 1})`;
}

function unitName(units: readonly { text: string }[], index: number | undefined): string {
  if (index === undefined) return "";
  const u = units[index];
  return u ? ` "${u.text}"` : "";
}

/** One splitter issue in plain words for an author. */
export function plainIssue(
  issue: BlendIssue | IssueLike,
  split: Pick<BlendSplit, "letters">,
  units: readonly { text: string }[] = [],
): PlainIssue {
  const at = letterName(split, issue.letter);
  const unit = unitName(units, issue.unit);
  let message: string;
  switch (issue.code) {
    case "missing_haraka":
      message = `The letter${at} has no haraka. Add a vowel, a sukoon or a shadda.`;
      break;
    case "shadda_without_vowel":
      message = `The shadda on${at} needs a vowel too.`;
      break;
    case "stray_alif":
      message = `The alif${at} is not a long vowel: the letter before it needs a fatha.`;
      break;
    case "lone_consonant":
      message = `The sukoon letter${at} has no vowel before it to join. A word cannot start with a sukoon, and two sukoon letters cannot follow each other here.`;
      break;
    case "unit_without_vowel":
      message = `The syllable${unit} has no vowel. Every syllable needs one.`;
      break;
    case "rebuild":
      message = "The syllables do not spell the word. Every letter must be in exactly one syllable (a shadda letter in two).";
      break;
    case "shadda_unpaired":
      message = `The syllable${unit} ends on the first half of a shadda; the next syllable must start with its second half.`;
      break;
    case "empty":
      message = "Type or pick a word.";
      break;
    case "unit_not_syllable":
      message = `The syllable${unit} is not one syllable. Split or join it again.`;
      break;
    case "inferred_sukoon":
      message = `The last letter${at} has no mark, so it is read with a sukoon. Add the sukoon (or a vowel) to say so.`;
      break;
    default:
      message = issue.message;
  }
  return { severity: issue.severity ?? "error", message };
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

/** The ending a legacy row shows today: full if its text has a final vowel or tanween. */
export function inferEndingFromText(text: string): BlendEnding {
  const plain = normaliseBlendText(text);
  return plain && pausal(plain) !== plain ? "full" : "pausal";
}

function formPreview(
  source: string,
  form: BlendEnding,
  override: readonly BlendOverrideUnit[] | undefined,
): BlendFormPreview {
  const split = splitBlendWord(source, form);
  if (override && override.length > 0) {
    const raw = checkBlendUnits(split.text, override);
    const issues = raw.map((i) => plainIssue(i, split, override));
    return {
      form,
      text: split.text,
      split,
      units: override.map((u, i) => ({ id: `u${i}`, text: u.text, kind: null, tags: describeTags(u.tags) })),
      issues,
      ok: !raw.some((i) => i.severity === "error"),
      overridden: true,
    };
  }
  return {
    form,
    text: split.text,
    split,
    units: split.units.map((u) => ({ id: u.id, text: u.text, kind: u.kind, tags: describeTags(u.tags) })),
    issues: split.issues.map((i) => plainIssue(i, split, split.units)),
    ok: split.ok,
    overridden: false,
  };
}

/**
 * Both forms of a word. The full form is the word as written (its library
 * text); the pausal form is derived from it by the splitter's `pausal()` rule.
 */
export function buildWordPreview(sourceText: string, edit?: WordBlendEdit): WordPreview {
  const source = normaliseBlendText(sourceText);
  const full = formPreview(source, "full", edit?.override?.full);
  const pausalPreview = formPreview(source, "pausal", edit?.override?.pausal);
  return {
    pausal: pausalPreview,
    full,
    fullKnown: !!source && pausal(source) !== source,
    sameText: pausalPreview.text === full.text,
  };
}

/**
 * Problems with a full form the author offers for a pausal-only word: it must
 * be the same word when paused, and it must add a final vowel or tanween.
 */
export function checkFullForm(sourceText: string, fullText: string): PlainIssue[] {
  const source = normaliseBlendText(sourceText);
  const full = normaliseBlendText(fullText);
  if (!full) return [];
  if (pausal(full) !== pausal(source)) {
    return [{
      severity: "error",
      message: `The full form must be the same word. Paused, it reads "${pausal(full)}", but the word reads "${pausal(source)}".`,
    }];
  }
  if (pausal(full) === full) {
    return [{ severity: "error", message: "The full form needs its case ending or tanween on the last letter." }];
  }
  return [];
}

/** True when the word has tanween in its full form (for the curriculum-order warning). */
export function hasTanween(preview: WordPreview): boolean {
  return preview.full.split.units.some((u) => u.tags.includes("tanween"));
}
