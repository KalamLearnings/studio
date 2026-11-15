import { describe, expect, it } from 'vitest';
import { LetterReferenceSchema } from '@kalam/curriculum-schemas';
import { carryMadd, hasMadd, maddState, setMadd, withMaddGlyph } from './letterMadd';

describe('letter madd helpers', () => {
  it('appends the carrier for each short vowel and nothing otherwise', () => {
    expect(withMaddGlyph('بَ', { haraka: 'fatha', madd: true })).toBe('بَا');
    expect(withMaddGlyph('بُ', { haraka: 'damma', madd: true })).toBe('بُو');
    expect(withMaddGlyph('بِ', { haraka: 'kasra', madd: true })).toBe('بِي');
    expect(withMaddGlyph('بْ', { haraka: 'sukoon', madd: true })).toBe('بْ');
    expect(withMaddGlyph('بَ', { haraka: 'fatha' })).toBe('بَ');
    expect(hasMadd({ haraka: 'shadda_fatha', madd: true })).toBe(false);
  });

  it('turns madd on and off only on short-vowel refs of the letter form', () => {
    const refs = [
      { letterId: 'ba', form: 'isolated' as const, haraka: 'fatha' as const },
      { letterId: 'ba', form: 'isolated' as const, haraka: 'sukoon' as const },
      { letterId: 'ba', form: 'final' as const, haraka: 'kasra' as const },
    ];
    expect(maddState(refs, 'ba', 'isolated')).toEqual({ available: true, on: false });
    const on = setMadd(refs, 'ba', 'isolated', true);
    expect(on).toEqual([
      { letterId: 'ba', form: 'isolated', haraka: 'fatha', madd: true },
      refs[1],
      refs[2],
    ]);
    expect(maddState(on, 'ba', 'isolated')).toEqual({ available: true, on: true });
    for (const ref of on) expect(LetterReferenceSchema.safeParse(ref).success).toBe(true);
    expect(setMadd(on, 'ba', 'isolated', false)).toEqual(refs);
    expect(maddState([{ letterId: 'ba', form: 'isolated' }], 'ba', 'isolated')).toEqual({ available: false, on: false });
  });

  it('carries madd only to another short vowel', () => {
    expect(carryMadd({ madd: true }, 'kasra')).toEqual({ madd: true });
    expect(carryMadd({ madd: true }, 'sukoon')).toEqual({});
    expect(carryMadd({ madd: true }, undefined)).toEqual({});
    expect(carryMadd({}, 'fatha')).toEqual({});
  });
});
