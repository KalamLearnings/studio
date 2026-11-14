import { describe, it, expect } from 'vitest';
import {
  computePeaks,
  flaggedUnits,
  marksEqual,
  marksErrorLines,
  MIN_UNIT_MS,
  moveMark,
  msToX,
  nearestMovableMark,
  suspectBoundaries,
  takeFlagText,
  xToMs,
} from './marks';

describe('computePeaks', () => {
  it('takes the min and max of each bucket', () => {
    const p = computePeaks([0, 0.5, -0.25, 1, -1, 0.1], 3);
    expect(p.min).toEqual([0, -0.25, -1]);
    expect(p.max).toEqual([0.5, 1, 0.1]);
  });
  it('copes with no samples and more buckets than samples', () => {
    expect(computePeaks([], 2)).toEqual({ min: [0, 0], max: [0, 0] });
    expect(computePeaks([0.5], 2).max).toEqual([0.5, 0.5]);
  });
});

describe('time and x', () => {
  it('maps both ways and clamps', () => {
    expect(msToX(250, 1000, 400)).toBe(100);
    expect(xToMs(100, 1000, 400)).toBe(250);
    expect(xToMs(-5, 1000, 400)).toBe(0);
    expect(xToMs(999, 1000, 400)).toBe(1000);
  });
});

describe('dragging a boundary', () => {
  const marks = [0, 200, 400, 700];
  it('grabs only interior boundaries near the pointer', () => {
    expect(nearestMovableMark(marks, 205, 10)).toBe(1);
    expect(nearestMovableMark(marks, 2, 10)).toBeNull();
    expect(nearestMovableMark(marks, 300, 10)).toBeNull();
  });
  it('keeps the boundary between its neighbours and the ends fixed', () => {
    expect(moveMark(marks, 1, 250.4)).toEqual([0, 250, 400, 700]);
    expect(moveMark(marks, 1, 999)).toEqual([0, 400 - MIN_UNIT_MS, 400, 700]);
    expect(moveMark(marks, 1, -50)).toEqual([0, MIN_UNIT_MS, 400, 700]);
    expect(moveMark(marks, 0, 50)).toEqual(marks);
    expect(moveMark(marks, 3, 50)).toEqual(marks);
  });
  it('compares marks', () => {
    expect(marksEqual(marks, [0, 200, 400, 700])).toBe(true);
    expect(marksEqual(marks, moveMark(marks, 2, 450))).toBe(false);
    expect(marksEqual(null, marks)).toBe(false);
  });
});

describe('suspect boundaries', () => {
  it('points alignment_off at the unit start and other flags at both edges', () => {
    expect(suspectBoundaries([{ check: 'alignment_off', unit: 2, message: 'unit 2 starts 90 ms after the burst' }], 5)).toEqual([2]);
    expect(suspectBoundaries([{ check: 'duration', unit: 1, message: 'x' }], 5)).toEqual([1, 2]);
  });
  it('never returns the fixed ends or a flag without a unit', () => {
    expect(suspectBoundaries([{ check: 'duration', unit: 0, message: 'x' }], 3)).toEqual([1]);
    expect(suspectBoundaries([{ check: 'structure', message: 'x' }], 3)).toEqual([]);
    expect(flaggedUnits([{ check: 'gap', unit: 1, message: '' }, { check: 'gap', unit: 1, message: '' }])).toEqual([1]);
  });
});

describe('the backend refusal', () => {
  it('lists TAKE_MARKS_INVALID flags in plain words with the syllable', () => {
    const lines = marksErrorLines(
      {
        code: 'TAKE_MARKS_INVALID',
        details: { flags: [{ check: 'duration', unit: 1, message: 'unit 1: short vowel lasts 300 ms' }] },
      },
      [{ text: 'كِ' }, { text: 'تَابْ' }],
    );
    expect(lines).toEqual(['A length is out of range at "تَابْ": unit 1: short vowel lasts 300 ms.']);
  });
  it('falls back to the message, and ignores other errors', () => {
    expect(marksErrorLines({ code: 'TAKE_MARKS_INVALID', message: 'The marks do not fit the take' })).toEqual([
      'The marks do not fit the take.',
    ]);
    expect(marksErrorLines({ code: 'TAKE_STALE' })).toBeNull();
    expect(takeFlagText({ check: 'gap', message: '' })).toBe('A silent gap.');
  });
});
