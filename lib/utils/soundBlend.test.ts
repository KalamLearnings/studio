import { describe, it, expect } from 'vitest';
import {
  autoDetectSegments,
  detectLetterDuration,
  getSoundBlendWarnings,
  remapSegmentForm,
  toIsolatedForm,
} from './soundBlend';

const durations = (word: string) => autoDetectSegments(word).map((s) => s.duration);

describe('autoDetectSegments: consonantal waw and ya are not madd (6 PROD words)', () => {
  it.each([
    // [word, expected durations per letter]
    ['قِفِيَ', [2, 2, 2]],
    ['يَيِيُ', [2, 2, 2]],
    ['عُوِّ', [2, 2]],
    ['عُوِّضَ', [2, 2, 2]],
    ['غَوِيَ', [2, 2, 2]],
    ['قَوِيَ', [2, 2, 2]],
  ])('%s gives no long segment', (word, expected) => {
    expect(durations(word)).toEqual(expected);
    expect(durations(word)).not.toContain(3);
  });
});

describe('autoDetectSegments: real madd is long', () => {
  it('كِتَابْ: fatha before a bare alif', () => {
    expect(durations('كِتَابْ')).toEqual([2, 3, 2, 1]);
  });

  it('نُور: damma before a bare waw', () => {
    expect(durations('نُور')).toEqual([3, 2, 2]);
  });

  it('دِين: kasra before a bare ya', () => {
    expect(durations('دِين')).toEqual([3, 2, 2]);
  });

  it('نُوْرْ: a sukoon on the madd waw is allowed', () => {
    expect(durations('نُوْرْ')).toEqual([3, 1, 1]);
  });

  it('مُوسَى: fatha before alif maqsura', () => {
    expect(durations('مُوسَى')).toEqual([3, 2, 3, 2]);
  });

  it('هٰذَا: a dagger alif on the letter is long', () => {
    expect(durations('هٰذَا')).toEqual([3, 3, 2]);
  });

  it('آدَمْ: alif madda is long', () => {
    expect(durations('آدَمْ')).toEqual([3, 2, 1]);
  });

  it('a letter with a shadda is never long', () => {
    expect(durations('مَّا')).toEqual([2, 2]);
  });

  it('kasra before alif and fatha before waw are not madd', () => {
    expect(durations('بِا')).toEqual([2, 2]);
    expect(durations('بَوْ')).toEqual([2, 1]);
  });

  it('a tanween seat alif is not madd: كِتَابًا', () => {
    expect(durations('كِتَابًا')).toEqual([2, 3, 2, 2, 2]);
  });
});

describe('bare final letter', () => {
  it('gives short (2), not stop, without a sukoon', () => {
    expect(durations('جَمَل')).toEqual([2, 2, 2]);
  });

  it('gives stop (1) with a sukoon', () => {
    expect(durations('جَمَلْ')).toEqual([2, 2, 1]);
  });

  it('warns about a bare final consonant', () => {
    expect(getSoundBlendWarnings('جَمَل')).toHaveLength(1);
    expect(getSoundBlendWarnings('نُور')).toHaveLength(1);
  });

  it.each(['جَمَلْ', 'جَمَلٌ', 'كِتَابُ', 'بَا', 'نُو', 'كِتَابًا', 'هُدًى', ''])(
    'does not warn for %s',
    (word) => {
      expect(getSoundBlendWarnings(word)).toEqual([]);
    }
  );
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

  it('keeps hand-set durations across a round trip', () => {
    const authored = autoDetectSegments('كِتَابْ', true).map((s, i) =>
      i === 0 ? { ...s, duration: 1 as const } : s
    );
    const roundTrip = authored
      .map((s) => remapSegmentForm(s, false))
      .map((s) => remapSegmentForm(s, true));
    expect(roundTrip).toEqual(authored);
  });
});
