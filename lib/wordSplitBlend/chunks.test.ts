import { describe, it, expect } from 'vitest';
import { buildWordPreview } from '../blendWord/preview';
import { parseBlendSaveError } from '../blendWord/saveErrors';
import {
  SHADDA_CHUNK_NOTE,
  chunkCapNote,
  chunkPreviewNotes,
  convertWarning,
  singleSyllableMessage,
  wordSplitBlendSaveErrorView,
} from './chunks';

const notesFor = (word: string, ending: 'pausal' | 'full') => chunkPreviewNotes(buildWordPreview(word)[ending], ending);

describe('chunkPreviewNotes', () => {
  it('says nothing for a plain word', () => {
    expect(notesFor('مَدْرَسَةٌ', 'pausal')).toEqual({ tooShort: null, notes: [] });
  });

  it('says nothing with no word', () => {
    expect(chunkPreviewNotes(null, 'pausal')).toEqual({ tooShort: null, notes: [] });
  });

  it('explains that a chunk keeps a split shadda whole', () => {
    expect(notesFor('مُدَرِّسَةٌ', 'full').notes).toEqual([SHADDA_CHUNK_NOTE]);
    // Paused, شَكَّ is one syllable: no split shadda, and too short.
    expect(notesFor('شَكَّ', 'pausal').notes).toEqual([]);
    expect(notesFor('شَكَّ', 'full').notes).toEqual([SHADDA_CHUNK_NOTE]);
  });

  it('explains the six-chunk cap', () => {
    const out = notesFor('فَتَكَاتَبَهُمَا', 'pausal');
    expect(out.notes).toEqual([chunkCapNote(7)]);
    expect(chunkCapNote(7)).toBe(
      'This word has 7 syllables. The app shows at most 6 chunks, so syllables 6 to 7 are joined into the last chunk.',
    );
  });

  it('warns about a one-syllable word in the chosen form', () => {
    expect(notesFor('كَلْبٌ', 'pausal').tooShort).toBe('This word is one syllable in the pausal form. Choose the full ending.');
    expect(notesFor('كَلْبٌ', 'full').tooShort).toBeNull();
    expect(notesFor('مِنْ', 'full').tooShort).toBe(singleSyllableMessage('full'));
  });
});

describe('wordSplitBlendSaveErrorView', () => {
  it('places the server refusal of a one-unit word under the ending, in plain words', () => {
    const errors = parseBlendSaveError({
      code: 'BLEND_INVALID',
      details: [{ field: 'config.ending', message: 'كَلْبْ is one unit; word_split_blend needs 2 or more' }],
    });
    expect(wordSplitBlendSaveErrorView(errors, 'pausal')).toEqual({
      ending: 'This word is one syllable in the pausal form. Choose the full ending.',
      general: [],
    });
  });

  it('keeps other field errors general', () => {
    const errors = parseBlendSaveError({
      code: 'BLEND_INVALID',
      details: [{ field: 'config.speed', message: 'not a word_split_blend field' }],
    });
    expect(wordSplitBlendSaveErrorView(errors, 'pausal')).toEqual({
      ending: null,
      general: ['config.speed: not a word_split_blend field'],
    });
  });

  it('is empty with no error', () => {
    expect(wordSplitBlendSaveErrorView(null, 'full')).toEqual({ ending: null, general: [] });
  });
});

describe('convertWarning', () => {
  it('warns that hand-made chunks will be replaced', () => {
    expect(convertWarning(true)).toMatch(/hand-made chunks will be replaced/);
    expect(convertWarning(false)).not.toMatch(/replaced/);
  });
});
