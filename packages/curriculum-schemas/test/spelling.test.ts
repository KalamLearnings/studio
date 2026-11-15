/**
 * normaliseSpelling (CM-B2), Studio's copy: the backend's cases
 * (kalam-readers-backend `{tests}/unit/words/spelling.test.ts`) run against
 * `src/spelling.ts`, so a Node-specific difference (NFKC, NFC, regex flags)
 * would show here even when the source is identical.
 */

import { describe, expect, it } from 'vitest';
import { normaliseSpelling, spellingKey } from '../src/spelling';

const FATHA = 'َ';
const KASRA = 'ِ';
const DAMMATAN = 'ٌ';
const SHADDA = 'ّ';
const TATWEEL = 'ـ';

function ok(raw: string): string {
  const result = normaliseSpelling(raw);
  expect(result.ok, `expected ${JSON.stringify(raw)} to be valid`).toBe(true);
  return result.spelling;
}

function codes(raw: string): string[] {
  const result = normaliseSpelling(raw);
  return result.ok ? [] : result.issues.map((i) => i.code);
}

describe('normaliseSpelling (parity with the backend)', () => {
  it('NFC composes decomposed letters (alif + hamza above is أ)', () => {
    expect(ok('أسد')).toBe('أسد');
    expect(ok('آ')).toBe('آ');
  });

  it('puts harakat in canonical order, vowel or tanween before shadda', () => {
    expect(ok('ب' + SHADDA + FATHA)).toBe('ب' + FATHA + SHADDA);
    expect(ok('ر' + SHADDA + KASRA)).toBe('ر' + KASRA + SHADDA);
    expect(ok('ب' + SHADDA + DAMMATAN)).toBe('ب' + DAMMATAN + SHADDA);
    expect(ok('شَدَّ')).toBe('شَدَّ');
  });

  it('removes tatweel, also between a letter and its marks', () => {
    expect(ok('كتـاب')).toBe('كتاب');
    expect(ok(TATWEEL + 'ب' + TATWEEL)).toBe('ب');
    expect(ok('جــ')).toBe('ج');
    expect(ok('ب' + TATWEEL + SHADDA + FATHA)).toBe('ب' + FATHA + SHADDA);
  });

  it('folds presentation forms to the base letters', () => {
    expect(ok('ﻛﺘﺎﺏ')).toBe('كتاب');
    expect(ok('ﻻ')).toBe('لا');
  });

  it('trims, and removes invisible format characters', () => {
    expect(ok(' جمل')).toBe('جمل');
    expect(ok('دار \n')).toBe('دار');
    expect(ok(' مِيزَان ')).toBe('مِيزَان');
    expect(ok('‏كتاب‌')).toBe('كتاب');
    expect(ok('﻿كتاب')).toBe('كتاب');
  });

  it('accepts Arabic letters and marks only', () => {
    expect(codes('1')).toEqual(['invalid_character']);
    expect(codes('٣')).toEqual(['invalid_character']);
    expect(codes('كَ + كْ')).toEqual(['invalid_character', 'invalid_character', 'invalid_character']);
    expect(codes('ال كتاب')).toEqual(['invalid_character']);
    expect(codes('kitab')).toEqual(Array(5).fill('invalid_character'));
    expect(codes('كتاب؟')).toEqual(['invalid_character']);
    expect(codes('پ')).toEqual(['invalid_character']);
    const issue = normaliseSpelling('ب1');
    expect(issue.ok ? null : issue.issues[0]).toEqual({
      code: 'invalid_character',
      index: 1,
      char: 'U+0031',
      message: 'U+0031 is not an Arabic letter or mark',
    });
  });

  it('rejects an empty text, or a mark with no letter', () => {
    expect(codes('')).toEqual(['empty']);
    expect(codes('  ' + TATWEEL + ' ')).toEqual(['empty']);
    expect(codes(FATHA + 'ب')).toEqual(['mark_without_letter']);
  });

  it('accepts the alphabet, hamza seats, ta marbuta, alif maqsura, wasla and the dagger alif', () => {
    for (const word of ['ابتثجحخدذرزسشصضطظعغفقكلمنهوي', 'ءأإآؤئ', 'مَدْرَسَةٌ', 'عَلَى', 'ٱلْكِتَابُ', 'هٰذَا', 'كِتَابًا']) {
      expect(ok(word)).toBe(word);
    }
  });

  it('is idempotent, and an invalid result still carries the normalised text', () => {
    for (const raw of [' كِتَـابٌ ', 'ب' + SHADDA + FATHA, 'ﻛﺘﺎﺏ']) {
      const once = ok(raw);
      expect(ok(once)).toBe(once);
    }
    expect(normaliseSpelling(' كَ + كْ ').spelling).toBe('كَ + كْ');
  });

  it('spellingKey is the normalised spelling, or null when it is not valid', () => {
    expect(spellingKey(' كتـاب')).toBe('كتاب');
    expect(spellingKey('3')).toBeNull();
    expect(spellingKey('')).toBeNull();
  });
});
