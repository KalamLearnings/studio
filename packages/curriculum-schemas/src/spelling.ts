/**
 * Word spelling: the normalised text that identifies one `curriculum_words`
 * row (content model D3, CM-B2). One row is one exact spelling; `كِتَاب`,
 * `كِتَابٌ` and `كتاب` are three spellings, but `كتـاب`, ` كتاب` and the
 * presentation-form `ﻛﺘﺎﺏ` are the same spelling as `كتاب`.
 *
 * Rules, in order:
 * 1. presentation forms folded to the base letters (NFKC);
 * 2. tatweel and invisible format characters (ZWJ, ZWNJ, bidi marks, BOM)
 *    removed;
 * 3. trimmed;
 * 4. NFC, which also puts harakat in canonical order: tanween and the short
 *    vowels (combining classes 27 to 32) sort before shadda (33), so
 *    `بّـَ` and `بَّ` are the same spelling;
 * 5. valid only when every character is an Arabic letter or an Arabic mark and
 *    the text starts with a letter. Spaces inside the text, digits, Latin,
 *    punctuation and letters of other languages (پ, ک, ی) make it invalid.
 *
 * Pure: no I/O, deterministic. The blend splitter has its own, looser
 * `normaliseBlendText` (it drops every space and keeps any character), which
 * stays a byte-identical copy shared with Studio and is not changed here.
 */

export type SpellingIssueCode = 'empty' | 'invalid_character' | 'mark_without_letter';

export interface SpellingIssue {
  code: SpellingIssueCode;
  /** Index (code point) in the normalised text, when the issue is about one character. */
  index?: number;
  /** The character, as `U+XXXX`, when the issue is about one character. */
  char?: string;
  message: string;
}

export type SpellingResult =
  | { ok: true; spelling: string }
  | { ok: false; spelling: string; issues: SpellingIssue[] };

const TATWEEL = /ـ/g;
/** Zero-width space, ZWNJ, ZWJ, LRM, RLM, ALM, bidi embeddings and isolates, BOM. */
const INVISIBLE = /[​-‏؜‪-‮⁦-⁩﻿]/g;

/** The Arabic letters: hamza to ghain, fa to ya, and alif wasla. */
function isArabicLetter(ch: string): boolean {
  const c = ch.codePointAt(0)!;
  return (c >= 0x0621 && c <= 0x063a) || (c >= 0x0641 && c <= 0x064a) || c === 0x0671;
}

/** Tanween, short vowels, shadda, sukoon, the other harakat and the dagger alif. */
function isArabicMark(ch: string): boolean {
  const c = ch.codePointAt(0)!;
  return (c >= 0x064b && c <= 0x065f) || c === 0x0670;
}

function codePoint(ch: string): string {
  return `U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`;
}

/** The normalised spelling of a word and whether it is a valid spelling. */
export function normaliseSpelling(raw: string): SpellingResult {
  const spelling = (typeof raw === 'string' ? raw : '')
    .normalize('NFKC')
    .replace(TATWEEL, '')
    .replace(INVISIBLE, '')
    .trim()
    .normalize('NFC');

  if (spelling === '') {
    return { ok: false, spelling, issues: [{ code: 'empty', message: 'The spelling is empty' }] };
  }

  const issues: SpellingIssue[] = [];
  const chars = Array.from(spelling);
  chars.forEach((ch, index) => {
    if (isArabicLetter(ch)) return;
    if (isArabicMark(ch)) {
      if (index === 0) {
        issues.push({
          code: 'mark_without_letter',
          index,
          char: codePoint(ch),
          message: 'The spelling starts with a mark that has no letter',
        });
      }
      return;
    }
    issues.push({
      code: 'invalid_character',
      index,
      char: codePoint(ch),
      message: `${codePoint(ch)} is not an Arabic letter or mark`,
    });
  });

  return issues.length ? { ok: false, spelling, issues } : { ok: true, spelling };
}

/** The `spelling_key` of a text: its normalised spelling, or null when that is not valid. */
export function spellingKey(raw: string): string | null {
  const result = normaliseSpelling(raw);
  return result.ok ? result.spelling : null;
}

/**
 * True when the text, once harakat, tatweel and whitespace are removed, is
 * exactly one Arabic letter (CM-B10c). Letters live in the alphabet
 * (`letters`), not the word bank.
 */
export function isSingleLetter(raw: string): boolean {
  const bare = (typeof raw === 'string' ? raw : '')
    .normalize('NFKC')
    .replace(TATWEEL, '')
    .replace(INVISIBLE, '')
    .replace(/\s+/g, '');
  const chars = Array.from(bare).filter((ch) => !isArabicMark(ch));
  const [only] = chars;
  return chars.length === 1 && only !== undefined && isArabicLetter(only);
}

export const WORD_IS_A_LETTER = 'WORD_IS_A_LETTER';
export const WORD_IS_A_LETTER_MESSAGE =
  'This is a single letter. Letters live in the alphabet, not the word bank.';
