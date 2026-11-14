import { describe, it, expect } from 'vitest';
import { CLIENT_WORD_EDIT_KEY, compactWordBlendEdit, resolveEnding, toBlendSaveParts } from './config';

describe('resolveEnding', () => {
  it('defaults to pausal', () => {
    expect(resolveEnding({})).toBe('pausal');
  });

  it('keeps a stored ending', () => {
    expect(resolveEnding({ ending: 'full', word: 'قَمَرْ' }, () => 'pausal')).toBe('full');
  });

  it('infers a legacy row from its text, never a v2 row', () => {
    expect(resolveEnding({ word: 'كَتَبَ' }, () => 'full')).toBe('full');
    expect(resolveEnding({ word: 'كَتَبَ', blendVersion: 2 }, () => 'full')).toBe('pausal');
  });
});

describe('toBlendSaveParts (the save body)', () => {
  const edit = { isPseudo: true, override: { pausal: [{ text: 'كِتَابْ', tags: ['madd' as const] }] } };

  it('moves the word edit beside config for a v2 row', () => {
    const out = toBlendSaveParts('sound_blend', { blendVersion: 2, wordRef: { text: 'كِتَابٌ' }, [CLIENT_WORD_EDIT_KEY]: edit });
    expect(out).toEqual({ config: { blendVersion: 2, wordRef: { text: 'كِتَابٌ' } }, wordBlendEdit: edit });
  });

  it('never sends a word edit without blendVersion 2', () => {
    const out = toBlendSaveParts('sound_blend', { word: 'بَ', [CLIENT_WORD_EDIT_KEY]: edit });
    expect(out).toEqual({ config: { word: 'بَ' } });
  });

  it('sends harakatSource with a v2 row', () => {
    const out = toBlendSaveParts('sound_blend', {
      blendVersion: 2,
      wordRef: { text: 'كِتَابٌ' },
      [CLIENT_WORD_EDIT_KEY]: { harakatSource: 'suggested_confirmed' },
    });
    expect(out.wordBlendEdit).toEqual({ harakatSource: 'suggested_confirmed' });
  });

  it('keeps only the one harakatSource value the server accepts', () => {
    expect(compactWordBlendEdit({ harakatSource: 'suggested_confirmed' })).toEqual({ harakatSource: 'suggested_confirmed' });
    expect(compactWordBlendEdit({ harakatSource: 'typed' as never })).toBeUndefined();
  });

  it('drops an empty edit', () => {
    const out = toBlendSaveParts('sound_blend', { blendVersion: 2, [CLIENT_WORD_EDIT_KEY]: { isPseudo: false } });
    expect(out).toEqual({ config: { blendVersion: 2 } });
  });

  it('passes a legacy row and other types through untouched', () => {
    const legacy = { word: 'بَابْ', segments: [{ sound: 'ﺏَ', duration: 3 }] };
    expect(toBlendSaveParts('sound_blend', legacy).config).toBe(legacy);
    const other = { [CLIENT_WORD_EDIT_KEY]: 1 };
    expect(toBlendSaveParts('tap_letter_in_word', other).config).toBe(other);
  });
});
