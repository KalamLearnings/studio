/**
 * Sound Blend Authoring Utilities
 *
 * Helpers for parsing Arabic words into sound segments and auto-detecting each
 * segment's duration (stop / short / long) for the sound_blend activity. Kept
 * out of the form component so the logic is unit-testable and reusable.
 *
 * Interim (SB-S0): the madd / duration rules here are a minimal stop-gap so
 * Studio stops writing wrong `segments` now. The backend's rule-based splitter
 * (`blend-word.ts`, SB-B1) owns this logic; SB-S1 removes the detection here
 * and imports that shared module instead. Do not extend these rules.
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

const FATHA = "\u064E";
const DAMMA = "\u064F";
const KASRA = "\u0650";
const SUKUN = "\u0652";
const SHADDA = "\u0651";
const FATHATAN = "\u064B";
const DAGGER_ALEF = "\u0670";
const MADDAH_ABOVE = "\u0653";
const ALEF = "\u0627";
const ALEF_MADDA = "\u0622";
const ALEF_MAKSURA = "\u0649";
const WAW = "\u0648";
const YA = "\u064A";

/** Marks that give a letter its own sound: a short vowel, a tanween, a sukoon or a dagger alif. */
const SOUND_MARKS = new Set([
  "\u064B", "\u064C", "\u064D", FATHA, DAMMA, KASRA, SUKUN, DAGGER_ALEF,
]);

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
 * True when `carrier` is a madd letter that lengthens the vowel of `previous`:
 * ا or ى after a fatha, و after a damma, ي after a kasra. The carrier must not
 * carry its own vowel, tanween, shadda or hamza; a sukoon is allowed on و and ي.
 * A letter with a shadda never has a madd after it.
 */
export function isMaddCarrier(previous: ParsedSegment, carrier: ParsedSegment): boolean {
  if (previous.harakat.includes(SHADDA)) return false;

  const marks = Array.from(carrier.harakat);
  const letter = carrier.baseLetter;

  if (letter === ALEF || letter === ALEF_MAKSURA) {
    return marks.length === 0 && previous.harakat.includes(FATHA);
  }
  if (letter === WAW || letter === YA) {
    if (!marks.every((mark) => mark === SUKUN)) return false;
    return letter === WAW
      ? previous.harakat.includes(DAMMA)
      : previous.harakat.includes(KASRA);
  }
  return false;
}

/** True when the letter is long by itself: آ, or a dagger alif on the letter. */
function isLongByItself(segment: ParsedSegment): boolean {
  if (segment.harakat.includes(SHADDA)) return false;
  if (segment.baseLetter === ALEF_MADDA) return true;
  if (segment.baseLetter === ALEF && segment.harakat.includes(MADDAH_ABOVE)) return true;
  return segment.harakat.includes(DAGGER_ALEF);
}

/**
 * Infer a segment's duration from its harakat and the following segment:
 * sukoon → stop (1), a madd → long (3), anything else → short (2).
 *
 * A stop is given only for a sukoon: the apps read duration 1 as a sukoon, so
 * a bare final letter is short and is reported by `getSoundBlendWarnings`.
 * `isLast` is kept for callers; a last segment has no next segment.
 */
export function detectDuration(
  segment: ParsedSegment,
  isLast: boolean,
  nextSegment?: ParsedSegment
): SoundDuration {
  if (segment.harakat.includes(SUKUN)) return 1;
  if (isLongByItself(segment)) return 3;
  if (!isLast && nextSegment && isMaddCarrier(segment, nextSegment)) return 3;
  return 2;
}

/** Duration for a single letter (Letter mode): a stop with a sukoon, otherwise short. */
export function detectLetterDuration(glyph: string): SoundDuration {
  const parsed = parseWordIntoSegments(glyph);
  const last = parsed[parsed.length - 1];
  return last && last.harakat.includes(SUKUN) ? 1 : 2;
}

/**
 * Author-facing warnings for a word. A bare final letter (no vowel, tanween or
 * sukoon) is ambiguous: the apps cannot tell a stop from a short sound. A final
 * madd letter (بَا, نُو) and a silent seat alif (كِتَابًا) are fine bare.
 */
export function getSoundBlendWarnings(word: string): string[] {
  const parsed = parseWordIntoSegments(word);
  if (parsed.length === 0) return [];

  const last = parsed[parsed.length - 1];
  const previous = parsed.length > 1 ? parsed[parsed.length - 2] : undefined;
  const hasSoundMark = Array.from(last.harakat).some((mark) => SOUND_MARKS.has(mark));
  if (hasSoundMark || isLongByItself(last)) return [];
  if (previous && isMaddCarrier(previous, last)) return [];
  const isSeatAlif =
    (last.baseLetter === ALEF || last.baseLetter === ALEF_MAKSURA) &&
    last.harakat === "" &&
    previous?.harakat.includes(FATHATAN);
  if (isSeatAlif) return [];

  return [
    `The last letter "${last.baseLetter}" has no mark: add a sukoon or a vowel.`,
  ];
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
