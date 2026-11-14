/**
 * A blend v2 word_split_blend row (ADR 0078, SB-B10) round-trips through
 * Studio: read (normalize), opened in the v2 form (never the legacy chunk
 * editor), edited with the shared word editor, and saved. Untouched, it keeps
 * every server-written field; edited, the save body carries `blendVersion`,
 * `wordRef` and `ending`, the word edit beside the config, and no
 * sound_blend-only field. A legacy row converts with "Use the word model".
 */

import { describe, it, expect } from 'vitest';
import { WordSplitBlendConfigSchema } from '@kalam/curriculum-schemas/activities';
import { normalizeActivityConfig } from './normalizeActivityConfig';
import { CLIENT_WORD_EDIT_KEY, isBlendV2, toBlendSaveParts } from '../../../lib/blendWord/config';
import {
  SOUND_BLEND_ONLY_FIELDS,
  convertToWordModel,
  wordSplitBlendWordEditor as editor,
  type WordSplitBlendFormConfig,
} from '../../../lib/wordSplitBlend/config';

const v2Row = {
  word: 'مَدْرَسَة',
  wordId: 'w-1',
  chunks: [{ text: 'مَدْ' }, { text: 'رَ' }, { text: 'سَة' }],
  meaning: 'school',
  blendVersion: 2 as const,
  wordRef: { wordId: 'w-1', text: 'مَدْرَسَة' },
  ending: 'pausal' as const,
};

describe('word_split_blend v2 round trip', () => {
  it('the schema keeps the v2 fields', () => {
    const parsed = WordSplitBlendConfigSchema.parse(v2Row);
    expect(parsed).toMatchObject({ blendVersion: 2, wordRef: v2Row.wordRef, ending: 'pausal' });
  });

  it('the schema refuses a wrong v2 value, as the backend does', () => {
    expect(WordSplitBlendConfigSchema.safeParse({ ...v2Row, blendVersion: 3 }).success).toBe(false);
    expect(WordSplitBlendConfigSchema.safeParse({ ...v2Row, ending: 'long' }).success).toBe(false);
    expect(WordSplitBlendConfigSchema.safeParse({ ...v2Row, wordRef: { text: 'مَدْرَسَة' } }).success).toBe(false);
  });

  it('a legacy row still parses without them', () => {
    const legacy: Partial<typeof v2Row> = { ...v2Row };
    delete legacy.blendVersion;
    delete legacy.wordRef;
    delete legacy.ending;
    expect(WordSplitBlendConfigSchema.safeParse(legacy).success).toBe(true);
  });

  it('read (normalize) then save (toBlendSaveParts) keeps every field', () => {
    const read = normalizeActivityConfig('word_split_blend', { ...v2Row });
    const { config, wordBlendEdit } = toBlendSaveParts('word_split_blend', read as Record<string, unknown>);
    expect(config).toEqual(v2Row);
    expect(wordBlendEdit).toBeUndefined();
    expect(WordSplitBlendConfigSchema.parse(config)).toMatchObject({
      blendVersion: 2,
      wordRef: v2Row.wordRef,
      ending: 'pausal',
    });
  });

  it('opens in the v2 form, not the legacy chunk editor', () => {
    expect(isBlendV2(normalizeActivityConfig('word_split_blend', { ...v2Row }))).toBe(true);
    const legacy: Record<string, unknown> = { ...v2Row };
    delete legacy.blendVersion;
    expect(isBlendV2(normalizeActivityConfig('word_split_blend', legacy))).toBe(false);
  });

  it('an edited v2 row saves blendVersion, wordRef, ending and the word edit beside config', () => {
    const read = normalizeActivityConfig('word_split_blend', { ...v2Row }) as WordSplitBlendFormConfig;
    const edited = editor.changePseudo(editor.changeEnding(read, 'full'), true);
    const { config, wordBlendEdit } = toBlendSaveParts('word_split_blend', edited as Record<string, unknown>);
    expect(config).toMatchObject({ blendVersion: 2, wordRef: v2Row.wordRef, ending: 'full', meaning: 'school' });
    expect(config.chunks).toEqual(v2Row.chunks);
    expect(config).not.toHaveProperty(CLIENT_WORD_EDIT_KEY);
    expect(wordBlendEdit).toEqual({ isPseudo: true });
    for (const key of SOUND_BLEND_ONLY_FIELDS) expect(config).not.toHaveProperty(key);
  });

  it('a legacy row converted with "Use the word model" saves on the word model', () => {
    const legacy: Record<string, unknown> = { ...v2Row };
    delete legacy.blendVersion;
    delete legacy.wordRef;
    delete legacy.ending;
    const read = normalizeActivityConfig('word_split_blend', legacy) as WordSplitBlendFormConfig;
    const { config, wordBlendEdit } = toBlendSaveParts('word_split_blend', convertToWordModel(read) as Record<string, unknown>);
    expect(config).toEqual({
      blendVersion: 2,
      wordRef: { wordId: 'w-1', text: 'مَدْرَسَة' },
      ending: 'pausal',
      chunks: v2Row.chunks,
      meaning: 'school',
    });
    expect(wordBlendEdit).toBeUndefined();
  });
});
