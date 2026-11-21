/**
 * Madd detection on a word's text (stretch_madd).
 *
 * A natural madd is a long vowel written with a carrier letter that carries no
 * vowel of its own, after the short vowel it lengthens: fatha + alif, damma +
 * waw, kasra + yaa (see `madd.ts`). The madd letter, its carrier and its kind
 * are all in the text, so an author never has to mark them.
 *
 * The kind sets the default count (how many beats the sound is held):
 * - `natural`: the madd is followed by an ordinary letter, or ends the word. 2 counts.
 * - `muttasil`: the madd is followed by a hamza in the same word (جَاءَ). 4 counts.
 * - `lazim`: the madd is followed by a shadda or a sukoon (الضَّالِّينَ). 6 counts.
 *
 * Not detected: the dagger alif (هٰذَا), alif with madda (آ) and the madd that
 * crosses a word break (munfasil). Words that carry them return no madd.
 *
 * IDENTICAL COPIES of this file live in:
 *   kalam-readers-backend/supabase/functions/_shared/core/contracts/curriculum-schemas/madd-detect.ts
 *   studio/packages/curriculum-schemas/src/madd-detect.ts
 * Edit both together. Pure; it needs only `harakat.ts` and `madd.ts`.
 */

import { harakaFromMarks, wordLetterUnits } from './harakat.ts';
import { MADD_CARRIER_BY_HARAKA, type MaddHaraka } from './madd.ts';

export const MADD_KINDS = ['natural', 'muttasil', 'lazim'] as const;
export type MaddKind = (typeof MADD_KINDS)[number];

/** Default beats to hold per kind. */
export const MADD_COUNTS_BY_KIND: Record<MaddKind, number> = {
  natural: 2,
  muttasil: 4,
  lazim: 6,
};

/** One madd found in a word. */
export interface DetectedMadd {
  /** Index of the madd letter among the word's letter units (`wordLetterUnits`). */
  index: number;
  /** The short vowel before it (the vowel it lengthens). */
  haraka: MaddHaraka;
  /** The madd letter: alif, waw or yaa. */
  carrier: 'alif' | 'waw' | 'yaa';
  kind: MaddKind;
  /** Default beats for `kind`. */
  counts: number;
}

const CARRIER_CHAR: Record<'alif' | 'waw' | 'yaa', readonly string[]> = {
  alif: ['ا'],
  waw: ['و'],
  yaa: ['ي', 'ى'],
};

const SHORT_VOWEL_OF: Record<string, MaddHaraka> = {
  fatha: 'fatha',
  damma: 'damma',
  kasra: 'kasra',
};

const SHADDA = 'ّ';
const SUKOON = 'ْ';
const HAMZAS = new Set(['ء', 'أ', 'إ', 'ؤ', 'ئ']);

/** The base letter of a unit (the unit minus its combining marks). */
const baseOf = (unit: string): string => unit[0] ?? '';

/** True when the unit carries a mark of its own that makes it a consonant (any vowel, tanween or shadda). */
function carriesOwnVowel(unit: string): boolean {
  const marks = unit.slice(1);
  if (marks.includes(SHADDA)) return true;
  const id = harakaFromMarks(unit);
  return id !== null && id !== 'sukoon';
}

function kindAfter(units: readonly string[], index: number): MaddKind {
  const next = units[index + 1];
  if (next === undefined) return 'natural';
  if (HAMZAS.has(baseOf(next))) return 'muttasil';
  if (next.includes(SHADDA) || next.includes(SUKOON)) return 'lazim';
  return 'natural';
}

/** Every natural madd in the word, in reading order (the first letter is the rightmost). */
export function detectMadds(text: string): DetectedMadd[] {
  const units = wordLetterUnits(text);
  const found: DetectedMadd[] = [];
  for (let i = 1; i < units.length; i++) {
    const unit = units[i] ?? '';
    const before = harakaFromMarks(units[i - 1] ?? '');
    const haraka = before ? SHORT_VOWEL_OF[before] : undefined;
    if (!haraka) continue;
    const carrier = MADD_CARRIER_BY_HARAKA[haraka];
    if (!CARRIER_CHAR[carrier].includes(baseOf(unit))) continue;
    if (carriesOwnVowel(unit)) continue;
    const kind = kindAfter(units, i);
    found.push({ index: i, haraka, carrier, kind, counts: MADD_COUNTS_BY_KIND[kind] });
  }
  return found;
}

/** The count of madds in a word. */
export const countMadd = (text: string): number => detectMadds(text).length;
