import { describe, it, expect } from 'vitest';
import {
  changeEnding,
  changeOverride,
  changePseudo,
  changeSpeed,
  changeStages,
  changeWord,
  currentEnding,
  previewV1Segments,
} from './editor';
import { buildWordPreview } from './preview';
import { wordEditOf, type SoundBlendConfig } from './config';

const v1 = (c: SoundBlendConfig) => previewV1Segments(c, buildWordPreview(c.wordRef?.text ?? c.word ?? '', wordEditOf(c)));
const sounds = (c: SoundBlendConfig) => v1(c).map((s) => s.sound).join('');
const durs = (c: SoundBlendConfig) => v1(c).map((s) => s.duration);

describe('changeWord', () => {
  it('picks a library word: reference, v2 fields and v1 segments of the pausal form', () => {
    const c = changeWord({ speed: 'blended' }, 'كِتَابٌ', { id: 'w1', is_pseudo: false });
    expect(c.wordRef).toEqual({ wordId: 'w1', text: 'كِتَابٌ' });
    expect(c.contentType).toBe('word');
    // server-owned: Studio writes no word or segments for v2 rows
    expect('word' in c).toBe(false);
    expect('segments' in c).toBe(false);
    expect(c.blendVersion).toBe(2);
    expect(c.ending).toBe('pausal');
    expect(c.stages).toEqual(['together', 'alone']);
    expect(wordEditOf(c)).toBeUndefined();
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
    expect(wordEditOf(c)?.override?.pausal).toHaveLength(1);
    c = changeWord(c, 'شِطِرَ', { id: 'p', is_pseudo: true });
    expect(wordEditOf(c)).toEqual({ isPseudo: true });
  });

  it('isolated glyphs in segmented mode (preview)', () => {
    const c = changeWord({ speed: 'segmented' }, 'بَابْ');
    expect(v1(c)[0]?.sound).toBe('ﺏَ');
  });

  it('drops the stored segments of a legacy row it converts', () => {
    const c = changeWord({ word: 'بَابْ', segments: [{ sound: 'ﺏَ', duration: 3 }], speed: 'none' }, 'بَابْ');
    expect(c.segments).toBeUndefined();
    expect(c.word).toBeUndefined();
    expect(c.speed).toBe('none');
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
    expect(wordEditOf(c)).toEqual({ isPseudo: true });
    expect(wordEditOf(changePseudo(c, false))).toBeUndefined();
  });

  it('a full form for a pausal-only word becomes the word itself', () => {
    let c = changeWord({}, 'كِتَابْ', { id: 'w1' });
    c = changeWord(c, 'كِتَابٌ');
    expect(c.wordRef).toEqual({ text: 'كِتَابٌ' });
  });

  it('a legacy speed change keeps durations and only remaps glyphs', () => {
    const c: SoundBlendConfig = { word: 'كِتَابْ', speed: 'fluent', segments: [{ sound: 'كِ', duration: 1 }] };
    const s = changeSpeed(c, 'segmented');
    expect(s.segments).toEqual([{ sound: 'ﻙِ', duration: 1 }]);
    expect(previewV1Segments(s, null)).toEqual(s.segments);
  });

  it('a v2 speed change stores only the speed', () => {
    const c = changeSpeed(changeWord({ speed: 'fluent' }, 'كِتَابْ'), 'segmented');
    expect(c.speed).toBe('segmented');
    expect(c.segments).toBeUndefined();
    expect(v1(c)[0]?.sound).toBe('ﻙِ');
  });
});

describe('changeOverride', () => {
  it('stores an override and clears it when it equals the splitter', () => {
    let c = changeWord({}, 'كِتَابٌ');
    c = changeOverride(c, 'full', [
      { text: 'كِتَا', tags: ['madd'] },
      { text: 'بٌ', tags: ['tanween'] },
    ]);
    expect(wordEditOf(c)?.override?.full).toHaveLength(2);
    c = changeOverride(c, 'full', [
      { text: 'كِ', tags: [] },
      { text: 'تَا', tags: ['madd'] },
      { text: 'بٌ', tags: ['tanween'] },
    ]);
    expect(wordEditOf(c)).toBeUndefined();
  });

  it('null resets the form', () => {
    let c = changeWord({}, 'كِتَابٌ');
    c = changeOverride(c, 'pausal', [{ text: 'كِتَابْ', tags: ['madd', 'sukoon'] }]);
    expect(wordEditOf(changeOverride(c, 'pausal', null))).toBeUndefined();
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
    expect(wordEditOf(c)?.override?.full?.map((u) => u.text)).toEqual(['كِتَا', 'بٌ']);
    c = splitFormUnit(c, 'full', 0, 1);
    // back to the splitter's own split: no override
    expect(wordEditOf(c)).toBeUndefined();
  });
});
