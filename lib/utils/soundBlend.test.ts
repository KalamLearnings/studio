import { describe, it, expect } from 'vitest';
import { splitBlendWord, type BlendForm } from '@kalam/curriculum-schemas';
import {
  detectLetterDuration,
  legacySegmentsFromSplit,
  remapSegmentForm,
  toIsolatedForm,
} from './soundBlend';

/** v1 durations for a word as written (the full form keeps the text unchanged). */
const durations = (word: string, form: BlendForm = 'full') =>
  legacySegmentsFromSplit(splitBlendWord(word, form)).map((s) => s.duration);

describe('legacySegmentsFromSplit: consonantal waw and ya are not madd (6 PROD words)', () => {
  it.each([
    ['قِفِيَ', [2, 2, 2]],
    ['يَيِيُ', [2, 2, 2]],
    ['عُوِّ', [2, 2]],
    ['عُوِّضَ', [2, 2, 2]],
    ['غَوِيَ', [2, 2, 2]],
    ['قَوِيَ', [2, 2, 2]],
  ])('%s gives no long segment', (word, expected) => {
    expect(durations(word)).toEqual(expected);
  });
});

describe('legacySegmentsFromSplit: real madd is long', () => {
  it.each([
    ['كِتَابْ', [2, 3, 2, 1]],
    ['نُوْرْ', [3, 1, 1]],
    ['مُوسَى', [3, 2, 3, 2]],
    ['هٰذَا', [3, 3, 2]],
    ['آدَمْ', [3, 2, 1]],
    ['كِتَابًا', [2, 3, 2, 2, 2]],
  ])('%s', (word, expected) => {
    expect(durations(word)).toEqual(expected);
  });

  it('kasra before alif and fatha before waw are not madd', () => {
    expect(durations('بَوْ')).toEqual([2, 1]);
  });

  it('a shadda letter is never long', () => {
    expect(durations('رَبِّ')).toEqual([2, 2]);
  });
});

describe('legacySegmentsFromSplit: the ending form decides the text', () => {
  it('pausal كِتَابٌ is كِتَابْ', () => {
    const segs = legacySegmentsFromSplit(splitBlendWord('كِتَابٌ', 'pausal'));
    expect(segs.map((s) => s.sound).join('')).toBe('كِتَابْ');
    expect(segs.map((s) => s.duration)).toEqual([2, 3, 2, 1]);
  });

  it('full كِتَابٌ keeps the tanween', () => {
    const segs = legacySegmentsFromSplit(splitBlendWord('كِتَابٌ', 'full'));
    expect(segs.map((s) => s.sound).join('')).toBe('كِتَابٌ');
    expect(segs.map((s) => s.duration)).toEqual([2, 3, 2, 2]);
  });

  it('a bare final letter is short, not a stop', () => {
    expect(durations('جَمَل')).toEqual([2, 2, 2]);
    expect(durations('جَمَلْ')).toEqual([2, 2, 1]);
  });

  it('maps to isolated glyphs on request', () => {
    const segs = legacySegmentsFromSplit(splitBlendWord('بَابْ', 'full'), true);
    expect(segs[0]?.sound).toBe(toIsolatedForm('ب') + 'َ');
  });
});

describe('detectLetterDuration (Letter mode)', () => {
  it('gives stop (1) for a sukoon', () => {
    expect(detectLetterDuration('بْ')).toBe(1);
    expect(detectLetterDuration('ﺑْ')).toBe(1);
  });

  it('gives short (2) otherwise', () => {
    expect(detectLetterDuration('بَ')).toBe(2);
    expect(detectLetterDuration('بّ')).toBe(2);
    expect(detectLetterDuration('ب')).toBe(2);
  });
});

describe('remapSegmentForm (reading mode change)', () => {
  it('maps to isolated forms and back, keeping harakat and duration', () => {
    const segment = { sound: 'تَ', duration: 3 as const };
    const isolated = remapSegmentForm(segment, true);
    expect(isolated).toEqual({ sound: toIsolatedForm('ت') + 'َ', duration: 3 });
    expect(remapSegmentForm(isolated, false)).toEqual(segment);
  });
});
