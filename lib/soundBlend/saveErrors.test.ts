import { describe, it, expect } from 'vitest';
import { parseBlendSaveError } from './saveErrors';

describe('parseBlendSaveError', () => {
  it('ignores other errors', () => {
    expect(parseBlendSaveError(null)).toBeNull();
    expect(parseBlendSaveError({ code: 'VALIDATION_ERROR', details: [] })).toBeNull();
  });

  it('groups the issues by form', () => {
    const out = parseBlendSaveError({
      code: 'BLEND_INVALID',
      details: [
        { form: 'pausal', issues: [{ code: 'missing_haraka', severity: 'error', letter: 1, message: 'letter has no haraka' }] },
        { form: 'full', issues: [{ code: 'unit_not_syllable', severity: 'error', unit: 0, message: 'x' }, { bad: 1 }] },
      ],
    })!;
    expect(out.byForm.pausal?.[0]?.code).toBe('missing_haraka');
    expect(out.byForm.full).toHaveLength(1);
    expect(out.general).toEqual([]);
  });

  it('keeps field errors as general messages', () => {
    const out = parseBlendSaveError({
      code: 'BLEND_INVALID',
      details: [{ field: 'config.wordRef.wordId', message: 'no word with id w9' }],
    })!;
    expect(out.general).toEqual(['config.wordRef.wordId: no word with id w9']);
  });

  it('says something when there are no details', () => {
    expect(parseBlendSaveError({ code: 'BLEND_INVALID' })!.general).toHaveLength(1);
  });
});
