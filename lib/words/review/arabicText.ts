// Synced copy of the backend primitives (content-audit/arabic.ts, CM-D0). Keep identical; do not edit here.
/**
 * Arabic text primitives for the content audit (CM-D0): the character classes
 * the audit classifier used (content-model-audit 02, section 1.3), letter
 * units, skeletons, presentation-form folding with the positional form, and
 * the default spelling key.
 *
 * The classes are the audit's on purpose, so the word classes reproduce:
 * base letters U+0621..U+063A, U+0641..U+064A and U+0671; marks are the short
 * vowels, tanween, shadda, sukoon and U+0670, U+0653..U+0655.
 */

const BASE_RANGES: Array<[number, number]> = [[0x0621, 0x063a], [0x0641, 0x064a], [0x0671, 0x0671]];

export const FATHA = 'َ';
export const DAMMA = 'ُ';
export const KASRA = 'ِ';
export const FATHATAN = 'ً';
export const DAMMATAN = 'ٌ';
export const KASRATAN = 'ٍ';
export const SHADDA = 'ّ';
export const SUKUN = 'ْ';
export const TATWEEL = 'ـ';

const SHORT_VOWELS = new Set([FATHA, DAMMA, KASRA]);
const TANWEEN = new Set([FATHATAN, DAMMATAN, KASRATAN]);
const OTHER_MARKS = new Set(['ٰ', 'ٕ', 'ٓ', 'ٔ']);

export function isBaseLetter(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  return ch.length === 1 && BASE_RANGES.some(([a, b]) => c >= a && c <= b);
}

/** A combining mark in the audit's set. */
export function isAuditMark(ch: string): boolean {
  return SHORT_VOWELS.has(ch) || TANWEEN.has(ch) || ch === SHADDA || ch === SUKUN ||
    OTHER_MARKS.has(ch);
}

/** Arabic Presentation Forms-A or -B code point. */
export function isPresentationForm(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  return (c >= 0xfb50 && c <= 0xfdff) || (c >= 0xfe70 && c <= 0xfeff);
}

/** Any Arabic-script code point (letters, marks, tatweel, presentation forms). */
export function isArabicScript(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  return (c >= 0x0600 && c <= 0x06ff) || (c >= 0x0750 && c <= 0x077f) || isPresentationForm(ch);
}

export const HAS_ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

/** The base letters of a string, in order (marks, tatweel and everything else dropped). */
export function skeleton(s: string): string {
  return Array.from(s).filter(isBaseLetter).join('');
}

/** One base letter with the marks that follow it (tatweel and other characters ignored). */
export interface LetterUnit {
  base: string;
  marks: string;
}

export function letterUnits(s: string): LetterUnit[] {
  const out: LetterUnit[] = [];
  for (const ch of Array.from(s)) {
    if (isBaseLetter(ch)) out.push({ base: ch, marks: '' });
    else if (isAuditMark(ch) && out.length > 0) out[out.length - 1].marks += ch;
  }
  return out;
}

/** The short vowels and sukoon in a mark string (tanween and shadda dropped), as the audit's `short()`. */
export function shortMarks(marks: string): string {
  return Array.from(marks).filter((ch) => SHORT_VOWELS.has(ch) || ch === SUKUN).join('');
}

export function hasAuditMarks(s: string): boolean {
  return Array.from(s).some(isAuditMark);
}

