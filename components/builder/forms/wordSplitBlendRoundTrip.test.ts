/**
 * A blend v2 word_split_blend row (ADR 0078, SB-B10) keeps its server-written
 * fields when Studio reads and saves it. Studio has no v2 authoring UI for this
 * type yet; it must only not drop `blendVersion`, `wordRef` and `ending`.
 */

import { describe, it, expect } from 'vitest';
import { WordSplitBlendConfigSchema } from '@kalam/curriculum-schemas/activities';
import { normalizeActivityConfig } from './normalizeActivityConfig';
import { toBlendSaveParts } from '../../../lib/soundBlend/config';

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
});
