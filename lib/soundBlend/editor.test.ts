import { describe, it, expect } from 'vitest';
import {
  changeEnding,
  changeFullText,
  changeOverride,
  changePseudo,
  changeSpeed,
  changeStages,
  changeWord,
  currentEnding,
} from './editor';
import type { SoundBlendConfig } from './config';

const sounds = (c: SoundBlendConfig) => (c.segments ?? []).map((s) => s.sound).join('');
const durs = (c: SoundBlendConfig) => (c.segments ?? []).map((s) => s.duration);

describe('changeWord', () => {
  it('picks a library word: reference, v2 fields and v1 segments of the pausal form', () => {
    const c = changeWord({ speed: 'blended' }, 'كِتَابٌ', { id: 'w1', is_pseudo: false });
    expect(c.wordRef).toEqual({ wordId: 'w1', text: 'كِتَابٌ' });
    expect(c.word).toBe('كِتَابٌ');
    expect(c.blendVersion).toBe(2);
    expect(c.ending).toBe('pausal');
    expect(c.stages).toEqual(['together', 'alone']);
    expect(c.wordBlendEdit).toBeUndefined();
    expect(sounds(c)).toBe('كِتَابْ');
    expect(durs(c)).toEqual([2, 3, 2, 1]);
  });

  it('a typed word has no wordId and drops the old one', () => {
    const picked = changeWord({}, 'كِتَابٌ', { id: 'w1' });
    const typed = changeWord(picked, 'قَمَرٌ');
    expect(typed.wordRef).toEqual({ text: 'قَمَرٌ' });
  });

  it('takes the pseudo flag from the library row and clears the old override', () => {
    let c = changeWord({}, 'كِتَابٌ');
    c = changeOverride(c, 'pausal', [{ text: 'كِتَابْ', tags: ['madd', 'sukoon'] }]);
    expect(c.wordBlendEdit?.override?.pausal).toHaveLength(1);
    c = changeWord(c, 'شِطِرَ', { id: 'p', is_pseudo: true });
    expect(c.wordBlendEdit).toEqual({ isPseudo: true });
  });

  it('isolated glyphs in segmented mode', () => {
    const c = changeWord({ speed: 'segmented' }, 'بَابْ');
    expect(c.segments?.[0]?.sound).toBe('ﺏَ');
  });
});

describe('settings', () => {
  it('the full ending rewrites the v1 segments from the full form', () => {
    const c = changeEnding(changeWord({ speed: 'fluent' }, 'كِتَابٌ'), 'full');
    expect(c.ending).toBe('full');
    expect(sounds(c)).toBe('كِتَابٌ');
  });

  it('stages are stored as given', () => {
    const c = changeStages(changeWord({}, 'كِتَابٌ'), ['model', 'together', 'alone', 'fade']);
    expect(c.stages).toEqual(['model', 'together', 'alone', 'fade']);
  });

  it('pseudo-word flag', () => {
    const c = changePseudo(changeWord({}, 'كَتَ'), true);
    expect(c.wordBlendEdit).toEqual({ isPseudo: true });
    expect(changePseudo(c, false).wordBlendEdit).toBeUndefined();
  });

  it('a typed full form is kept and used for the full ending', () => {
    let c = changeWord({ speed: 'fluent' }, 'كِتَابْ');
    c = changeFullText(c, 'كِتَابٌ');
    c = changeEnding(c, 'full');
    expect(c.wordBlendEdit).toEqual({ fullText: 'كِتَابٌ' });
    expect(sounds(c)).toBe('كِتَابٌ');
    expect(c.word).toBe('كِتَابْ');
  });

  it('the speed change keeps durations and only remaps glyphs', () => {
    const c = changeWord({ speed: 'fluent' }, 'كِتَابْ');
    const s = changeSpeed(c, 'segmented');
    expect(durs(s)).toEqual(durs(c));
    expect(s.segments?.[0]?.sound).toBe('ﻙِ');
  });
});

describe('changeOverride', () => {
  it('stores an override and clears it when it equals the splitter', () => {
    let c = changeWord({}, 'كِتَابٌ');
    c = changeOverride(c, 'full', [
      { text: 'كِتَا', tags: ['madd'] },
      { text: 'بٌ', tags: ['tanween'] },
    ]);
    expect(c.wordBlendEdit?.override?.full).toHaveLength(2);
    c = changeOverride(c, 'full', [
      { text: 'كِ', tags: [] },
      { text: 'تَا', tags: ['madd'] },
      { text: 'بٌ', tags: ['tanween'] },
    ]);
    expect(c.wordBlendEdit).toBeUndefined();
  });

  it('null resets the form', () => {
    let c = changeWord({}, 'كِتَابٌ');
    c = changeOverride(c, 'pausal', [{ text: 'كِتَابْ', tags: ['madd', 'sukoon'] }]);
    expect(changeOverride(c, 'pausal', null).wordBlendEdit).toBeUndefined();
  });
});

describe('currentEnding', () => {
  it('reads a legacy row from its text', () => {
    expect(currentEnding({ word: 'كَتَبَ' })).toBe('full');
    expect(currentEnding({ word: 'كَتَبْ' })).toBe('pausal');
    expect(currentEnding({ word: 'كَتَبَ', blendVersion: 2, ending: 'pausal' })).toBe('pausal');
  });
});

describe('splitFormUnit / mergeFormUnits', () => {
  it('edits from the splitter, then from the override', async () => {
    const { splitFormUnit, mergeFormUnits } = await import('./editor');
    let c = changeWord({}, 'كِتَابٌ');
    c = mergeFormUnits(c, 'full', 0);
    expect(c.wordBlendEdit?.override?.full?.map((u) => u.text)).toEqual(['كِتَا', 'بٌ']);
    c = splitFormUnit(c, 'full', 0, 1);
    // back to the splitter's own split: no override
    expect(c.wordBlendEdit).toBeUndefined();
  });
});
