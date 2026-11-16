/**
 * "What the child sees" for an AI draft in Review (CW-7): a read-only reading
 * of the draft's config, for the two types the generator makes (grid_tap and
 * tap_letter_in_word). Pure. Every stored letter shape is read through the
 * shared `readLetterRef` (a reference object or a glyph string), so a draft
 * reads the way the server reads it. Anything this cannot read is reported as
 * missing, never guessed.
 */

import { applyHaraka, stripHarakat, TATWEEL } from "@kalam/curriculum-schemas";
import { LETTER_IDS, readLetterRef } from "@kalam/curriculum-schemas/server";

type Form = "isolated" | "initial" | "medial" | "final";

const GLYPH_OF: ReadonlyMap<string, string> = new Map(Object.entries(LETTER_IDS).map(([glyph, id]) => [id, glyph]));

export interface PreviewLetter {
  /** The glyph as shown: the letter, its haraka, and a tatweel for a positional form. */
  glyph: string;
  /** The bare letter, for matching inside a word. */
  base: string;
  form: Form;
}

/** One stored letter value as a glyph; null when it is not a letter this can read. */
export function previewLetter(value: unknown): PreviewLetter | null {
  const ref = readLetterRef(value);
  if (!ref || typeof ref !== "object") return null;
  const { letterId, form, haraka } = ref as { letterId?: unknown; form?: unknown; haraka?: unknown };
  const base = typeof letterId === "string" ? GLYPH_OF.get(letterId) : undefined;
  if (!base) return null;
  const f: Form = form === "initial" || form === "medial" || form === "final" ? form : "isolated";
  const shaped = f === "initial" ? base + TATWEEL : f === "medial" ? TATWEEL + base + TATWEEL : f === "final" ? TATWEEL + base : base;
  return { glyph: applyHaraka(shaped, typeof haraka === "string" ? haraka : null), base, form: f };
}

const letters = (value: unknown): PreviewLetter[] =>
  (Array.isArray(value) ? value : value === undefined || value === null ? [] : [value])
    .map(previewLetter)
    .filter((l): l is PreviewLetter => l !== null);

const posInt = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) && v > 0 ? v : null);

export interface GridPreview {
  kind: "grid";
  targets: PreviewLetter[];
  distractors: PreviewLetter[];
  targetCount: number;
  total: number;
  /** True when the config leaves the count to the app (the preview then uses 4 of 12). */
  countsDefaulted: boolean;
  /** The grid as drawn: targets spread through the distractors. The app shuffles it. */
  cells: { glyph: string; target: boolean }[];
  theme: string | null;
}

export interface WordPreview {
  kind: "word";
  word: string;
  /** The word's logical letters (a base letter and its marks). */
  units: { text: string; target: boolean }[];
  letter: PreviewLetter | null;
  /** How many taps the child makes. */
  targetCount: number;
  meaning: string | null;
  /** True when the draft names positions (`targetIndices`); else every matching letter is a target. */
  byPosition: boolean;
}

export interface MissingPreview {
  kind: "missing";
  /** What could not be read, in plain words. */
  reason: string;
}

export type DraftPreview = GridPreview | WordPreview | MissingPreview;

const DEFAULT_TOTAL = 12;
const DEFAULT_TARGETS = 4;

function gridPreview(config: Record<string, unknown>): DraftPreview {
  const targets = letters(config.targetLetter);
  if (targets.length === 0) return { kind: "missing", reason: "The draft names no target letter this page can read." };
  const distractors = letters(config.distractorLetters);
  const total = posInt(config.totalItems) ?? DEFAULT_TOTAL;
  const targetCount = Math.min(posInt(config.targetCount) ?? DEFAULT_TARGETS, total);
  const cells: GridPreview["cells"] = [];
  // Targets every `step` cells, so the drawing reads as a hunt; the app shuffles the real grid.
  const step = Math.max(1, Math.floor(total / targetCount));
  let placed = 0;
  let d = 0;
  for (let i = 0; i < total; i++) {
    const isTarget = placed < targetCount && (i % step === 0 || total - i <= targetCount - placed);
    if (isTarget || distractors.length === 0) {
      cells.push({ glyph: targets[placed % targets.length].glyph, target: true });
      placed += 1;
    } else {
      cells.push({ glyph: distractors[d % distractors.length].glyph, target: false });
      d += 1;
    }
  }
  return {
    kind: "grid",
    targets,
    distractors,
    targetCount,
    total,
    countsDefaulted: posInt(config.totalItems) === null || posInt(config.targetCount) === null,
    cells,
    theme: typeof config.theme === "string" && config.theme.trim() ? config.theme : null,
  };
}

const MARK = /[ً-ٰٟ]/;

/** A word as logical letters: each base letter with the marks after it (the builder's rule). */
export function logicalLetters(word: string): string[] {
  const out: string[] = [];
  for (const ch of Array.from(word.normalize("NFC"))) {
    if (ch.trim() === "" || ch === TATWEEL) continue;
    if (MARK.test(ch) && out.length > 0) out[out.length - 1] += ch;
    else if (!MARK.test(ch)) out.push(ch);
  }
  return out;
}

function wordPreview(config: Record<string, unknown>): DraftPreview {
  const word = typeof config.targetWord === "string" ? config.targetWord.trim() : "";
  if (!word) return { kind: "missing", reason: "The draft has no word." };
  const letter = previewLetter(config.targetLetter);
  const units = logicalLetters(word);
  const indices = Array.isArray(config.targetIndices)
    ? config.targetIndices.filter((i): i is number => Number.isInteger(i) && i >= 0 && i < units.length)
    : [];
  const byPosition = indices.length > 0;
  const targets = new Set(
    byPosition ? indices : letter ? units.flatMap((u, i) => (stripHarakat(u) === letter.base ? [i] : [])) : [],
  );
  return {
    kind: "word",
    word,
    units: units.map((text, i) => ({ text, target: targets.has(i) })),
    letter,
    targetCount: posInt(config.targetCount) ?? Math.max(targets.size, 1),
    meaning: typeof config.wordMeaning === "string" && config.wordMeaning.trim() ? config.wordMeaning.trim() : null,
    byPosition,
  };
}

/** The preview of a draft's config, or why there is none. */
export function draftPreview(type: string, config: Record<string, unknown> | null | undefined): DraftPreview {
  if (!config) return { kind: "missing", reason: "The draft has no config." };
  if (type === "grid_tap") return gridPreview(config);
  if (type === "tap_letter_in_word") return wordPreview(config);
  return { kind: "missing", reason: `Review has no preview for ${type} yet. Open it in the builder.` };
}
