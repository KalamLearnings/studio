/**
 * v1 `segments` helpers (sound_blend).
 *
 * The syllable split, the madd and long-vowel rules and the warnings come from
 * the shared splitter (`splitBlendWord` in `@kalam/curriculum-schemas`).
 * For v2 rows (`blendVersion: 2`) the SERVER writes `segments` (SB-B3);
 * `legacySegmentsFromSplit` only previews them in the form and is never saved.
 * Legacy rows keep their stored segments; letter mode and the reading-mode
 * glyph re-map still write them.
 */

import type { BlendDraftUnit, BlendLetter } from "@kalam/curriculum-schemas";
import type { SoundDuration, SoundSegment } from "../soundBlend/config";

export type { SoundDuration, SoundSegment } from "../soundBlend/config";

/** A base letter together with the harakat that follow it in the word. */
export interface ParsedSegment {
  baseLetter: string;
  harakat: string;
}

/** Arabic diacritics (harakat). */
const HARAKAT = new Set([
  "ً", "ٌ", "ٍ", "َ", "ُ", "ِ",
  "ّ", "ْ", "ٓ", "ٔ", "ٕ", "ٰ",
]);

const SUKUN = "ْ";
const SHADDA = "ّ";

/** Isolated presentation forms, used when authoring in "segmented" mode. */
const ISOLATED_FORMS: Record<string, string> = {
  "ا": "ﺍ", "أ": "ﺃ", "إ": "ﺇ", "آ": "ﺁ", "ب": "ﺏ", "ت": "ﺕ",
  "ث": "ﺙ", "ج": "ﺝ", "ح": "ﺡ", "خ": "ﺥ", "د": "ﺩ", "ذ": "ﺫ",
  "ر": "ﺭ", "ز": "ﺯ", "س": "ﺱ", "ش": "ﺵ", "ص": "ﺹ", "ض": "ﺽ",
  "ط": "ﻁ", "ظ": "ﻅ", "ع": "ﻉ", "غ": "ﻍ", "ف": "ﻑ", "ق": "ﻕ",
  "ك": "ﻙ", "ل": "ﻝ", "م": "ﻡ", "ن": "ﻥ", "ه": "ﻩ", "و": "ﻭ",
  "ي": "ﻱ", "ى": "ﻯ", "ة": "ﺓ", "ء": "ء", "ئ": "ﺉ", "ؤ": "ﺅ",
};

export function toIsolatedForm(letter: string): string {
  return ISOLATED_FORMS[letter] || letter;
}

/** Split a word into base letters, each carrying the harakat that follow it. */
export function parseWordIntoSegments(word: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  const chars = Array.from(word);
  let i = 0;

  while (i < chars.length) {
    const char = chars[i];
    if (HARAKAT.has(char)) {
      i++;
      continue;
    }

    let harakat = "";
    let j = i + 1;
    while (j < chars.length && HARAKAT.has(chars[j])) {
      harakat += chars[j];
      j++;
    }

    segments.push({ baseLetter: char, harakat });
    i = j;
  }

  return segments;
}

/**
 * v1 `segments` from a split: one segment per letter of the split text.
 *
 * The duration rule (TECH-DESIGN 3.3), read from the splitter's units:
 * - a letter with a sukoon is a stop (1);
 * - the letter that opens a long-vowel unit (madd, dagger alif, آ) is long (3),
 *   unless it has a shadda;
 * - every other letter is short (2). A bare final letter is short, and the
 *   splitter reports it (`inferred_sukoon`).
 */
export function legacySegmentsFromSplit(
  split: { letters: readonly BlendLetter[]; units: readonly BlendDraftUnit[] },
  useIsolated = false,
): SoundSegment[] {
  const longOnsets = new Set<number>();
  for (const unit of split.units) {
    if (unit.vowel?.long && !unit.span.startsMid) longOnsets.add(unit.span.from);
  }
  return split.letters.map((l, i) => {
    let duration: SoundDuration = 2;
    if (l.marks.includes(SUKUN)) duration = 1;
    else if (longOnsets.has(i) && !l.marks.includes(SHADDA)) duration = 3;
    const letter = useIsolated ? toIsolatedForm(l.letter) : l.letter;
    return { sound: letter + l.marks, duration };
  });
}

/** Duration for a single letter (Letter mode): a stop with a sukoon, otherwise short. */
export function detectLetterDuration(glyph: string): SoundDuration {
  const parsed = parseWordIntoSegments(glyph);
  const last = parsed[parsed.length - 1];
  return last && last.harakat.includes(SUKUN) ? 1 : 2;
}

const FROM_ISOLATED_FORMS: Record<string, string> = Object.fromEntries(
  Object.entries(ISOLATED_FORMS).map(([base, isolated]) => [isolated, base])
);

/**
 * Re-map a segment's letter to the isolated or the connected glyph form for a
 * reading mode. Only the glyph changes: the harakat and the duration stay.
 */
export function remapSegmentForm(segment: SoundSegment, useIsolated: boolean): SoundSegment {
  const sound = Array.from(segment.sound)
    .map((char) => (useIsolated ? toIsolatedForm(char) : FROM_ISOLATED_FORMS[char] || char))
    .join("");
  return { ...segment, sound };
}
