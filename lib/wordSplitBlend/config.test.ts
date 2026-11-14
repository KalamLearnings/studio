import { describe, it, expect } from 'vitest';
import { CLIENT_WORD_EDIT_KEY, toBlendSaveParts, wordEditOf } from '../blendWord/config';
import {
  SOUND_BLEND_ONLY_FIELDS,
  convertToWordModel,
  hasHandMadeChunks,
  pickWord,
  stampWordSplitBlendFields,
  wordSplitBlendWordEditor as editor,
  type WordSplitBlendFormConfig,
} from './config';

const legacy: WordSplitBlendFormConfig = {
  word: 'مَدْرَسَة',
  wordId: 'w-1',
  chunks: [{ text: 'مَدْ', audio_url: 'https://a/1.mp3' }, { text: 'رَ' }, { text: 'سَة' }],
  wordAudioUrl: 'https://a/word.mp3',
  transliteration: 'madrasa',
  meaning: 'school',
};

/** The backend's `blendTypeIssues` check for word_split_blend: no sound_blend-only key. */
const soundBlendOnlyKeys = (config: Record<string, unknown>) =>
  SOUND_BLEND_ONLY_FIELDS.filter((k) => config[k] !== undefined);

describe('convertToWordModel ("Use the word model")', () => {
  it('stamps blendVersion 2, the word reference and the ending the row shows', () => {
    const out = convertToWordModel(legacy);
    expect(out.blendVersion).toBe(2);
    expect(out.wordRef).toEqual({ wordId: 'w-1', text: 'مَدْرَسَة' });
    expect(out.ending).toBe('pausal');
  });

  it('infers the full ending from a row that shows a final vowel', () => {
    expect(convertToWordModel({ word: 'كِتَابٌ', chunks: [] }).ending).toBe('full');
  });

  it('drops the server-owned word and wordId, keeps chunks (for their audio) and the v1 extras', () => {
    const out = convertToWordModel(legacy);
    expect(out).not.toHaveProperty('word');
    expect(out).not.toHaveProperty('wordId');
    expect(out.chunks).toEqual(legacy.chunks);
    expect(out).toMatchObject({ wordAudioUrl: legacy.wordAudioUrl, transliteration: 'madrasa', meaning: 'school' });
  });

  it('sends a typed word as text only, and no word edit', () => {
    const out = convertToWordModel({ word: 'قَمَرْ', chunks: [{ text: 'قَ' }, { text: 'مَرْ' }] });
    expect(out.wordRef).toEqual({ text: 'قَمَرْ' });
    expect(wordEditOf(out)).toBeUndefined();
  });

  it('drops any sound_blend-only field', () => {
    const out = convertToWordModel({ ...legacy, speed: 'fast', stages: ['together'], contentType: 'word' } as WordSplitBlendFormConfig);
    expect(soundBlendOnlyKeys(out as Record<string, unknown>)).toEqual([]);
  });

  it('does not change the legacy row it was given', () => {
    const copy = structuredClone(legacy);
    convertToWordModel(legacy);
    expect(legacy).toEqual(copy);
  });

  it('knows when there are hand-made chunks to warn about', () => {
    expect(hasHandMadeChunks(legacy)).toBe(true);
    expect(hasHandMadeChunks({ chunks: [{ text: '' }, { text: ' ' }] })).toBe(false);
    expect(hasHandMadeChunks({})).toBe(false);
  });
});

describe('the word editor on word_split_blend', () => {
  const v2 = convertToWordModel(legacy);

  it('a library word sets the reference, the pseudo flag, transliteration and meaning', () => {
    const out = pickWord(v2, 'كِتَابٌ', { id: 'w-2', is_pseudo: true, transliteration: 'kitab', english: 'book' });
    expect(out.wordRef).toEqual({ wordId: 'w-2', text: 'كِتَابٌ' });
    expect(wordEditOf(out)).toEqual({ isPseudo: true });
    expect(out).toMatchObject({ transliteration: 'kitab', meaning: 'book' });
  });

  it('a typed word drops the wordId', () => {
    expect(pickWord(v2, 'قَمَرْ').wordRef).toEqual({ text: 'قَمَرْ' });
  });

  it('never writes stages or speed', () => {
    let c = editor.changeEnding(v2, 'full');
    c = editor.changePseudo(c, true);
    c = editor.splitFormUnit(c, 'full', 0, 1);
    expect(soundBlendOnlyKeys(c as Record<string, unknown>)).toEqual([]);
    expect(c.ending).toBe('full');
  });

  it('confirms a harakat suggestion with the shared editor', () => {
    const out = editor.confirmHarakatSuggestion(pickWord(v2, 'كتاب'), 'كِتَابٌ');
    expect(out.wordRef).toEqual({ text: 'كِتَابٌ' });
    expect(wordEditOf(out)?.harakatSource).toBe('suggested_confirmed');
  });

  it('the mapper keeps the type to its own fields', () => {
    const out = stampWordSplitBlendFields(
      { word: 'x', wordId: 'w', chunks: [{ text: 'x' }], segments: [] } as WordSplitBlendFormConfig,
      { wordRef: { text: 'y' }, ending: 'pausal', wordBlendEdit: undefined },
    );
    expect(out).toEqual({ blendVersion: 2, ending: 'pausal', wordRef: { text: 'y' }, chunks: [{ text: 'x' }] });
  });
});

describe('the save body of a word_split_blend v2 row', () => {
  it('sends blendVersion, wordRef and ending in config, wordBlendEdit at the top level', () => {
    let c = convertToWordModel(legacy);
    c = editor.changePseudo(c, true);
    c = editor.changeEnding(c, 'full');
    const body = toBlendSaveParts('word_split_blend', c as Record<string, unknown>);
    expect(body.config).toMatchObject({ blendVersion: 2, wordRef: { wordId: 'w-1', text: 'مَدْرَسَة' }, ending: 'full' });
    expect(body.wordBlendEdit).toEqual({ isPseudo: true });
    expect(body.config).not.toHaveProperty(CLIENT_WORD_EDIT_KEY);
    expect(body.config).not.toHaveProperty('wordBlendEdit');
    expect(soundBlendOnlyKeys(body.config)).toEqual([]);
  });

  it('sends an override of the played form beside config', () => {
    const c = editor.splitFormUnit(convertToWordModel(legacy), 'pausal', 0, 1);
    const body = toBlendSaveParts('word_split_blend', c as Record<string, unknown>);
    expect(body.wordBlendEdit?.override?.pausal?.map((u) => u.text)).toEqual(['مَ', 'دْ', 'رَ', 'سَة']);
  });

  it('a converted row with no word edit sends no wordBlendEdit', () => {
    const body = toBlendSaveParts('word_split_blend', convertToWordModel(legacy) as Record<string, unknown>);
    expect(body.wordBlendEdit).toBeUndefined();
    expect(body.config.chunks).toEqual(legacy.chunks);
  });

  it('a legacy row is sent exactly as it is', () => {
    const row = { ...legacy } as Record<string, unknown>;
    expect(toBlendSaveParts('word_split_blend', row).config).toBe(row);
  });
});
