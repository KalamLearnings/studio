/**
 * Sound Blend Authoring Utilities
 *
 * Helpers for parsing Arabic words into sound segments and auto-detecting each
 * segment's duration (stop / short / long) for the sound_blend activity. Kept
 * out of the form component so the logic is unit-testable and reusable.
 */

export type SoundDuration = 1 | 2 | 3;

export interface SoundSegment {
  sound: string;
  duration: SoundDuration;
}

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

const FATHA = "َ";
const DAMMA = "ُ";
const KASRA = "ِ";
const SUKUN = "ْ";
const ALEF = "ا";
const WAW = "و";
const YA = "ي";

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
 * Infer a segment's duration from its harakat and the following segment:
 * sukun / bare word-final → stop, madd pairs (fatha+alef etc.) → long, else short.
 */
export function detectDuration(
  segment: ParsedSegment,
  isLast: boolean,
  nextSegment?: ParsedSegment
): SoundDuration {
  const { harakat } = segment;

  if (harakat.includes(SUKUN)) return 1;
  if (isLast && !harakat) return 1;

  if (nextSegment) {
    const nextLetter = nextSegment.baseLetter;
    if (harakat.includes(FATHA) && nextLetter === ALEF) return 3;
    if (harakat.includes(DAMMA) && nextLetter === WAW) return 3;
    if (harakat.includes(KASRA) && nextLetter === YA) return 3;
  }

  return 2;
}

/** Build sound segments for a word, optionally rendering letters in isolated form. */
export function autoDetectSegments(word: string, useIsolated = false): SoundSegment[] {
  if (!word) return [];

  const parsed = parseWordIntoSegments(word);
  const segments: SoundSegment[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const segment = parsed[i];
    const isLast = i === parsed.length - 1;
    const nextSegment = i < parsed.length - 1 ? parsed[i + 1] : undefined;
    const duration = detectDuration(segment, isLast, nextSegment);
    const letter = useIsolated ? toIsolatedForm(segment.baseLetter) : segment.baseLetter;
    segments.push({ sound: letter + segment.harakat, duration });
  }

  return segments;
}
