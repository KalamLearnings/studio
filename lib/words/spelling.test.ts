import { describe, it, expect } from 'vitest';
import { parseWordSpellingError, plainSpellingIssue, previewWordSpelling, WORD_IS_A_LETTER, WORD_SPELLING_INVALID } from './spelling';

const FATHA = 'َ';
const SHADDA = 'ّ';

const library = [
  { id: 'word_3', arabic: 'كتـاب', created_at: '2026-03-01' },
  { id: 'word_1', arabic: 'كتاب', created_at: '2026-01-01' },
  { id: 'word_2', arabic: ' كتاب', created_at: '2026-02-01' },
  { id: 'word_4', arabic: 'ب' + FATHA + SHADDA, created_at: '2026-01-01' },
  { id: 'word_5', arabic: 'جمل ', created_at: '2026-05-01', english: 'camel' },
  { id: 'word_6', arabic: '3', created_at: '2026-01-01' },
];

describe('previewWordSpelling (the row saveWord would use)', () => {
  it('is null for an empty field', () => {
    expect(previewWordSpelling('', library)).toBeNull();
    expect(previewWordSpelling('  ', library)).toBeNull();
  });

  it('uses the row whose text is exactly the input first, even a legacy twin', () => {
    const p = previewWordSpelling('كتـاب', library)!;
    expect(p.kind).toBe('exact');
    expect(p.kind === 'exact' && p.word.id).toBe('word_3');
    // an exact row is reused even when its text is not a valid spelling
    expect(previewWordSpelling('3', library)).toMatchObject({ kind: 'exact', word: { id: 'word_6' } });
  });

  it('reuses the oldest row with the same normalised spelling', () => {
    const p = previewWordSpelling('كتــاب ', library)!;
    expect(p).toMatchObject({ kind: 'reuse', spelling: 'كتاب', word: { id: 'word_1' } });
  });

  it('matches a legacy row whose own text is not normalised (trailing space)', () => {
    expect(previewWordSpelling('جمل', library)).toMatchObject({ kind: 'reuse', spelling: 'جمل', word: { id: 'word_5' } });
  });

  it('matches harakat typed in another order', () => {
    expect(previewWordSpelling('ب' + SHADDA + FATHA, library)).toMatchObject({ kind: 'reuse', word: { id: 'word_4' } });
  });

  it('reports a new word and its normalised spelling when nothing matches', () => {
    expect(previewWordSpelling('أسد', library)).toEqual({ kind: 'new', spelling: 'أسد', changed: false });
    expect(previewWordSpelling(' أسـد', library)).toEqual({ kind: 'new', spelling: 'أسد', changed: true });
  });

  it('keeps vowelled and unvowelled spellings apart (one row per exact spelling)', () => {
    expect(previewWordSpelling('كِتَاب', library)).toMatchObject({ kind: 'new', spelling: 'كِتَاب' });
  });

  it('reports an invalid spelling with its issues', () => {
    const p = previewWordSpelling('ال كتاب', library)!;
    expect(p.kind).toBe('invalid');
    expect(p.kind === 'invalid' && p.issues.map((i) => i.code)).toEqual(['invalid_character']);
  });

  it('breaks an age tie by id, and puts rows without a date last', () => {
    const rows = [
      { id: 'b', arabic: 'دار ', created_at: '2026-01-01' },
      { id: 'a', arabic: 'دار‌', created_at: '2026-01-01' },
      { id: 'c', arabic: ' دار', created_at: null },
    ];
    expect(previewWordSpelling('دارـ', rows)).toMatchObject({ kind: 'reuse', word: { id: 'a' } });
  });
});

describe('plainSpellingIssue', () => {
  it('names the character, and a space as a space', () => {
    expect(plainSpellingIssue({ code: 'invalid_character', index: 2, char: 'U+0020', message: 'x' }, 'ال كتاب')).toBe(
      'A space (U+0020) is not an Arabic letter or haraka.',
    );
    expect(plainSpellingIssue({ code: 'invalid_character', index: 1, char: 'U+0031', message: 'x' }, 'ب1')).toBe(
      '"1" (U+0031) is not an Arabic letter or haraka.',
    );
  });

  it('words the other codes plainly, and falls back to the server message', () => {
    expect(plainSpellingIssue({ code: 'empty', message: 'x' }, '')).toBe('The word is empty.');
    expect(plainSpellingIssue({ code: 'mark_without_letter', index: 0, message: 'x' }, FATHA + 'ب')).toMatch(/haraka/);
    expect(plainSpellingIssue({ code: 'invalid_character', index: 9, message: 'server text' }, 'ب')).toBe('server text');
  });
});

describe('parseWordSpellingError (the backend WORD_SPELLING_INVALID refusal)', () => {
  it('ignores other errors', () => {
    expect(parseWordSpellingError(null)).toBeNull();
    expect(parseWordSpellingError({ code: 'BLEND_INVALID', details: [] })).toBeNull();
  });

  it('reads the details the backend sends', () => {
    const out = parseWordSpellingError({
      code: WORD_SPELLING_INVALID,
      details: {
        arabic: ' كتاب؟',
        spelling: 'كتاب؟',
        issues: [{ code: 'invalid_character', index: 4, char: 'U+061F', message: 'U+061F is not an Arabic letter or mark' }, { bad: 1 }],
      },
    })!;
    expect(out.arabic).toBe(' كتاب؟');
    expect(out.spelling).toBe('كتاب؟');
    expect(out.messages).toEqual(['"؟" (U+061F) is not an Arabic letter or haraka.']);
  });

  it('turns WORD_IS_A_LETTER into a plain line', () => {
    expect(parseWordSpellingError({ code: WORD_IS_A_LETTER, details: { arabic: 'ب' } })).toEqual({
      arabic: 'ب',
      spelling: null,
      messages: ['This is a single letter. Letters live in the alphabet, not the word bank.'],
    });
  });

  it('still says what went wrong without details', () => {
    expect(parseWordSpellingError({ code: WORD_SPELLING_INVALID })!.messages).toEqual([
      'The word is not a valid Arabic spelling.',
    ]);
  });
});
