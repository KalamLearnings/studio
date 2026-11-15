import { describe, expect, it } from 'vitest';
import { phraseKey, PhraseRefWriteSchema } from '@kalam/curriculum-schemas/server';
import {
  addWord,
  canAddWord,
  EMPTY_PHRASE,
  fromPhraseItem,
  moveWord,
  phraseProblems,
  phraseReadingText,
  phraseWordChoices,
  phraseWordIssue,
  removeWordAt,
  setSentence,
  toPhraseItem,
  type PhraseWord,
} from './phraseItem';

const word = (id: string, arabic: string, over: Partial<PhraseWord> = {}): PhraseWord => ({
  id,
  arabic,
  english: null,
  reviewed_at: '2026-11-01T00:00:00Z',
  retired_at: null,
  is_pseudo: false,
  ...over,
});

const bank = new Map<string, PhraseWord>([
  ['fi', word('fi', 'فِي')],
  ['albayti', word('albayti', 'البَيْتِ')],
  ['hadha', word('hadha', ' هٰذا ')],
  ['babun', word('babun', 'بابٌ')],
  ['draft', word('draft', 'بَيْت', { reviewed_at: null })],
  ['old', word('old', 'قَديم', { retired_at: '2026-10-01T00:00:00Z' })],
  ['drill', word('drill', 'بَا', { is_pseudo: true })],
]);
const byId = (id: string) => bank.get(id);

describe('phrase word choices', () => {
  it('offers reviewed, live, real words only', () => {
    expect(phraseWordChoices([...bank.values()]).map((w) => w.id)).toEqual(['fi', 'albayti', 'hadha', 'babun']);
  });

  it('names why a word may not stand in a phrase, as the server does', () => {
    expect(phraseWordIssue(bank.get('fi'))).toBeNull();
    expect(phraseWordIssue(undefined)).toBe('missing');
    expect(phraseWordIssue(bank.get('draft'))).toBe('unreviewed');
    expect(phraseWordIssue(bank.get('old'))).toBe('retired');
    expect(phraseWordIssue(bank.get('drill'))).toBe('pseudo');
  });
});

describe('editing a phrase', () => {
  const p = addWord(addWord(addWord(EMPTY_PHRASE, 'fi'), 'albayti'), 'hadha');

  it('adds in reading order, removes and reorders', () => {
    expect(p.wordIds).toEqual(['fi', 'albayti', 'hadha']);
    expect(removeWordAt(p, 1).wordIds).toEqual(['fi', 'hadha']);
    expect(moveWord(p, 2, -1).wordIds).toEqual(['fi', 'hadha', 'albayti']);
    expect(moveWord(p, 0, 1).wordIds).toEqual(['albayti', 'fi', 'hadha']);
  });

  it('ignores a move past either end', () => {
    expect(moveWord(p, 0, -1)).toBe(p);
    expect(moveWord(p, 2, 1)).toBe(p);
  });

  it('caps a phrase at 4 words and a sentence at 8', () => {
    let four = EMPTY_PHRASE;
    for (const id of ['fi', 'albayti', 'hadha', 'babun']) four = addWord(four, id);
    expect(canAddWord(four)).toBe(false);
    expect(canAddWord(setSentence(four, true))).toBe(true);
  });
});

describe('reading text', () => {
  it('joins the word rows in order with one space, NFC and trimmed, like the server', () => {
    expect(phraseReadingText(['hadha', 'babun'], byId)).toBe('هٰذا بابٌ'.normalize('NFC'));
  });

  it('is null when a word row is missing', () => {
    expect(phraseReadingText(['fi', 'nope'], byId)).toBeNull();
  });
});

describe('problems and the saved item', () => {
  it('a valid phrase has no problems and saves the backend write shape', () => {
    const draft = { wordIds: ['fi', 'albayti'], isSentence: false };
    expect(phraseProblems(draft, byId)).toEqual([]);
    const item = toPhraseItem(draft);
    expect(item).toEqual({ kind: 'phrase', phrase: { wordIds: ['fi', 'albayti'], isSentence: false } });
    expect(PhraseRefWriteSchema.safeParse(item).success).toBe(true);
    expect(phraseKey(item!.phrase.wordIds)).toBe('fi albayti');
  });

  it('refuses one word, or five words for a phrase (the schema length rule)', () => {
    expect(toPhraseItem({ wordIds: ['fi'], isSentence: false })).toBeNull();
    const five = { wordIds: ['fi', 'albayti', 'hadha', 'babun', 'fi'], isSentence: false };
    expect(toPhraseItem(five)).toBeNull();
    expect(toPhraseItem({ ...five, isSentence: true })).not.toBeNull();
    expect(phraseProblems(five, byId)).toEqual(['A phrase holds 2 to 4 words (it has 5).']);
  });

  it('lists each word the server would refuse', () => {
    expect(phraseProblems({ wordIds: ['draft', 'old', 'drill', 'gone'], isSentence: true }, byId)).toEqual([
      'Word 1 (بَيْت) is not reviewed yet.',
      'Word 2 (قَديم) is retired.',
      'Word 3 (بَا) is a drill word, not a real word.',
      'Word 4 (gone) is not in the word bank.',
    ]);
  });
});

describe('reading a stored item', () => {
  it('reads ids from strings or { wordId } refs and a missing flag as false', () => {
    expect(fromPhraseItem({ kind: 'phrase', phrase: { wordIds: ['fi', { wordId: 'albayti' }], text: 'x' } })).toEqual({
      wordIds: ['fi', 'albayti'],
      isSentence: false,
    });
  });

  it('reads anything else as an empty phrase', () => {
    expect(fromPhraseItem(undefined)).toEqual(EMPTY_PHRASE);
    expect(fromPhraseItem({ kind: 'word', wordId: 'fi' })).toEqual(EMPTY_PHRASE);
  });
});
