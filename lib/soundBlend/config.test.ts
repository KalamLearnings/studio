import { describe, it, expect } from 'vitest';
import {
  CLIENT_WORD_EDIT_KEY,
  DEFAULT_STAGES,
  toBlendSaveParts,
  clearBlendFields,
  compactWordBlendEdit,
  resolveEnding,
  resolveStages,
  sourceWordText,
  stampBlendFields,
  toggleStage,
  validateStages,
} from './config';

describe('validateStages', () => {
  it('accepts the default pair and every ordered optional set', () => {
    expect(validateStages(DEFAULT_STAGES)).toEqual([]);
    expect(validateStages(['model', 'together', 'togetherFast', 'alone', 'fade'])).toEqual([]);
  });

  it('refuses alone before together', () => {
    expect(validateStages(['alone', 'together']).join(' ')).toMatch(/together slide must come before the alone/);
  });

  it('refuses a list without the pair', () => {
    expect(validateStages(['together'])).toHaveLength(1);
    expect(validateStages(['model', 'fade'])).toHaveLength(2);
  });

  it('refuses unknown, repeated and out-of-order stages', () => {
    expect(validateStages(['together', 'alone', 'wobble'])[0]).toMatch(/not a stage/);
    expect(validateStages(['together', 'together', 'alone']).join(' ')).toMatch(/twice/);
    expect(validateStages(['together', 'fade', 'alone']).join(' ')).toMatch(/order/);
  });
});

describe('toggleStage', () => {
  it('adds an optional stage in its place', () => {
    expect(toggleStage(['together', 'alone'], 'model', true)).toEqual(['model', 'together', 'alone']);
    expect(toggleStage(['together', 'alone'], 'togetherFast', true)).toEqual(['together', 'togetherFast', 'alone']);
    expect(toggleStage(['together', 'alone'], 'fade', true)).toEqual(['together', 'alone', 'fade']);
  });

  it('removes an optional stage', () => {
    expect(toggleStage(['model', 'together', 'alone'], 'model', false)).toEqual(['together', 'alone']);
  });

  it('never removes the pair', () => {
    expect(toggleStage(['together', 'alone'], 'alone', false)).toEqual(['together', 'alone']);
    expect(toggleStage(['together', 'alone'], 'together', false)).toEqual(['together', 'alone']);
  });
});

describe('resolveStages (TECH-DESIGN 4.3 defaults)', () => {
  it('uses a valid stored list', () => {
    expect(resolveStages({ stages: ['model', 'together', 'alone'] })).toEqual(['model', 'together', 'alone']);
  });

  it('falls back to the pair for an invalid list or a new row', () => {
    expect(resolveStages({ stages: ['alone', 'together'] })).toEqual(['together', 'alone']);
    expect(resolveStages({})).toEqual(['together', 'alone']);
  });

  it('gives a legacy showBothSpeeds row three slides', () => {
    expect(resolveStages({ showBothSpeeds: true })).toEqual(['together', 'togetherFast', 'alone']);
  });
});

describe('resolveEnding', () => {
  it('defaults to pausal', () => {
    expect(resolveEnding({})).toBe('pausal');
  });

  it('keeps a stored ending', () => {
    expect(resolveEnding({ ending: 'full', word: 'قَمَرْ' }, () => 'pausal')).toBe('full');
  });

  it('infers a legacy row from its text, never a v2 row', () => {
    expect(resolveEnding({ word: 'كَتَبَ' }, () => 'full')).toBe('full');
    expect(resolveEnding({ word: 'كَتَبَ', blendVersion: 2 }, () => 'full')).toBe('pausal');
  });
});

describe('stamping', () => {
  it('reads the word from the reference first', () => {
    expect(sourceWordText({ word: 'a', wordRef: { text: 'b' } })).toBe('b');
    expect(sourceWordText({ word: 'a' })).toBe('a');
    expect(sourceWordText(undefined)).toBe('');
  });

  it('writes the v2 fields and drops an empty word edit', () => {
    const out = stampBlendFields(
      { word: 'كِتَابٌ', speed: 'segmented' },
      {
        wordRef: { wordId: 'w1', text: 'كِتَابٌ' },
        ending: 'pausal',
        stages: ['together', 'alone'],
        wordBlendEdit: { isPseudo: false, override: {} },
      },
    );
    expect(out).toEqual({
      contentType: 'word',
      speed: 'segmented',
      blendVersion: 2,
      wordRef: { wordId: 'w1', text: 'كِتَابٌ' },
      ending: 'pausal',
      stages: ['together', 'alone'],
    });
  });

  it('compacts the word edit', () => {
    expect(compactWordBlendEdit({ isPseudo: true, override: { full: [] } })).toEqual({ isPseudo: true });
    expect(compactWordBlendEdit({})).toBeUndefined();
  });

  it('clears every v2 field for letter mode', () => {
    expect(
      clearBlendFields({ word: 'بَ', blendVersion: 2, ending: 'full', stages: ['together', 'alone'], wordRef: { text: 'x' }, [CLIENT_WORD_EDIT_KEY]: { isPseudo: true } }),
    ).toEqual({ word: 'بَ' });
  });
});

describe('toBlendSaveParts (the save body)', () => {
  const edit = { isPseudo: true, override: { pausal: [{ text: 'كِتَابْ', tags: ['madd' as const] }] } };

  it('moves the word edit beside config for a v2 row', () => {
    const out = toBlendSaveParts('sound_blend', { blendVersion: 2, wordRef: { text: 'كِتَابٌ' }, [CLIENT_WORD_EDIT_KEY]: edit });
    expect(out).toEqual({ config: { blendVersion: 2, wordRef: { text: 'كِتَابٌ' } }, wordBlendEdit: edit });
  });

  it('never sends a word edit without blendVersion 2', () => {
    const out = toBlendSaveParts('sound_blend', { word: 'بَ', [CLIENT_WORD_EDIT_KEY]: edit });
    expect(out).toEqual({ config: { word: 'بَ' } });
  });

  it('sends harakatSource with a v2 row', () => {
    const out = toBlendSaveParts('sound_blend', {
      blendVersion: 2,
      wordRef: { text: 'كِتَابٌ' },
      [CLIENT_WORD_EDIT_KEY]: { harakatSource: 'suggested_confirmed' },
    });
    expect(out.wordBlendEdit).toEqual({ harakatSource: 'suggested_confirmed' });
  });

  it('keeps only the one harakatSource value the server accepts', () => {
    expect(compactWordBlendEdit({ harakatSource: 'suggested_confirmed' })).toEqual({ harakatSource: 'suggested_confirmed' });
    expect(compactWordBlendEdit({ harakatSource: 'typed' as never })).toBeUndefined();
  });

  it('drops an empty edit', () => {
    const out = toBlendSaveParts('sound_blend', { blendVersion: 2, [CLIENT_WORD_EDIT_KEY]: { isPseudo: false } });
    expect(out).toEqual({ config: { blendVersion: 2 } });
  });

  it('passes a legacy row and other types through untouched', () => {
    const legacy = { word: 'بَابْ', segments: [{ sound: 'ﺏَ', duration: 3 }] };
    expect(toBlendSaveParts('sound_blend', legacy).config).toBe(legacy);
    const other = { [CLIENT_WORD_EDIT_KEY]: 1 };
    expect(toBlendSaveParts('tap_letter_in_word', other).config).toBe(other);
  });
});
