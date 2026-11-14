import { describe, it, expect } from 'vitest';
import { checkBlendUnits } from '@kalam/curriculum-schemas';
import { canSplitUnit, mergeWithNext, sameUnits, splitUnit, unitLetters } from './override';
import type { BlendOverrideUnit } from './config';

const kitab: BlendOverrideUnit[] = [
  { text: 'كِ', tags: [] },
  { text: 'تَابْ', tags: ['sukoon', 'madd', 'qalqala'] },
];

describe('unitLetters', () => {
  it('keeps marks with their letter', () => {
    expect(unitLetters('تَابْ')).toEqual(['تَ', 'ا', 'بْ']);
    expect(canSplitUnit({ text: 'كِ' })).toBe(false);
  });
});

describe('splitUnit', () => {
  it('splits between letters and moves the coda tags to the last piece', () => {
    const out = splitUnit(kitab, 1, 2);
    expect(out).toEqual([
      { text: 'كِ', tags: [] },
      { text: 'تَا', tags: ['madd'] },
      { text: 'بْ', tags: ['sukoon', 'qalqala'] },
    ]);
    // a lone sukoon letter breaks the hard rules
    expect(checkBlendUnits('كِتَابْ', out).map((i) => i.code)).toEqual(['unit_without_vowel']);
  });

  it('ignores an out-of-range split point', () => {
    expect(splitUnit(kitab, 1, 0)).toEqual(kitab);
    expect(splitUnit(kitab, 1, 3)).toEqual(kitab);
    expect(splitUnit(kitab, 5, 1)).toEqual(kitab);
  });
});

describe('mergeWithNext', () => {
  it('joins two units and unions their tags', () => {
    const out = mergeWithNext(kitab, 0);
    expect(out).toEqual([{ text: 'كِتَابْ', tags: ['sukoon', 'madd', 'qalqala'] }]);
    expect(checkBlendUnits('كِتَابْ', out)).toEqual([]);
  });

  it('drops a shadda pair merged into one unit', () => {
    const rabbi: BlendOverrideUnit[] = [
      { text: 'رَبْ', tags: ['shaddaFirst'] },
      { text: 'بِ', tags: ['shaddaSecond'] },
    ];
    const out = mergeWithNext(rabbi, 0);
    expect(out).toEqual([{ text: 'رَبْبِ', tags: [] }]);
    expect(checkBlendUnits('رَبِّ', out)).toEqual([]);
  });

  it('a split then a merge round-trips', () => {
    expect(sameUnits(mergeWithNext(splitUnit(kitab, 1, 1), 1), kitab)).toBe(true);
  });
});
