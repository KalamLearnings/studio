/**
 * The harakat Confirm edit (SB-S2) bound to sound_blend's mapper. The offer,
 * the messages and the request are tested in lib/blendWord/harakat.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { changeEnding, changePseudo, changeWord, confirmHarakatSuggestion, splitFormUnit } from './editor';
import { CLIENT_WORD_EDIT_KEY, toBlendSaveParts, wordEditOf } from '../blendWord/config';

describe('confirmHarakatSuggestion', () => {
  it('replaces the word text, without a wordId, dropping the old override', () => {
    let c = changeWord({}, 'كتاب', { id: 'w1' });
    c = changeWord(c, 'كِتَابْ', { id: 'w1' });
    c = splitFormUnit(c, 'pausal', 1, 1);
    expect(wordEditOf(c)?.override?.pausal).toBeDefined();
    const next = confirmHarakatSuggestion(c, 'كِتَابٌ');
    expect(next.wordRef).toEqual({ text: 'كِتَابٌ' });
    expect(next.blendVersion).toBe(2);
    expect(wordEditOf(next)?.override).toBeUndefined();
  });

  it('keeps the pseudo-word flag', () => {
    const c = changePseudo(changeWord({}, 'شطر'), true);
    expect(wordEditOf(confirmHarakatSuggestion(c, 'شِطِرَ'))?.isPseudo).toBe(true);
  });

  it('is a no-op for the same text', () => {
    const c = changeWord({}, 'كِتَابٌ', { id: 'w1' });
    expect(confirmHarakatSuggestion(c, 'كِتَابٌ')).toBe(c);
  });

  it('marks the word edit as a confirmed suggestion', () => {
    const next = confirmHarakatSuggestion(changeWord({}, 'كتاب'), 'كِتَابٌ');
    expect(wordEditOf(next)?.harakatSource).toBe('suggested_confirmed');
  });

  it('keeps the mark with the pseudo-word flag and later blend edits', () => {
    const c = changePseudo(changeWord({}, 'شطر'), true);
    let next = confirmHarakatSuggestion(c, 'شِطِرَ');
    expect(wordEditOf(next)).toMatchObject({ isPseudo: true, harakatSource: 'suggested_confirmed' });
    next = changeEnding(next, 'full');
    expect(wordEditOf(next)?.harakatSource).toBe('suggested_confirmed');
  });

  it('is cleared when the author retypes or picks the word by hand', () => {
    const confirmed = confirmHarakatSuggestion(changeWord({}, 'كتاب'), 'كِتَابٌ');
    expect(wordEditOf(changeWord(confirmed, 'كِتَابٌ'))?.harakatSource).toBeUndefined();
    expect(wordEditOf(changeWord(confirmed, 'بَابٌ'))?.harakatSource).toBeUndefined();
    expect(wordEditOf(changeWord(confirmed, 'بَابٌ', { id: 'w2' }))?.harakatSource).toBeUndefined();
  });

  it('is sent beside config with blendVersion 2, through toBlendSaveParts', () => {
    const confirmed = confirmHarakatSuggestion(changeWord({}, 'كتاب'), 'كِتَابٌ');
    const out = toBlendSaveParts('sound_blend', confirmed as Record<string, unknown>);
    expect(out.config.blendVersion).toBe(2);
    expect(out.config).not.toHaveProperty(CLIENT_WORD_EDIT_KEY);
    expect(out.wordBlendEdit).toEqual({ harakatSource: 'suggested_confirmed' });
  });

  it('is not sent after a retype', () => {
    const confirmed = confirmHarakatSuggestion(changeWord({}, 'كتاب'), 'كِتَابٌ');
    const retyped = changeWord(confirmed, 'بَابٌ');
    expect(toBlendSaveParts('sound_blend', retyped as Record<string, unknown>).wordBlendEdit).toBeUndefined();
  });

  it('is never sent without blendVersion 2', () => {
    const confirmed = confirmHarakatSuggestion(changeWord({}, 'كتاب'), 'كِتَابٌ');
    const legacy = { ...confirmed };
    delete legacy.blendVersion;
    const out = toBlendSaveParts('sound_blend', legacy as Record<string, unknown>);
    expect(out.wordBlendEdit).toBeUndefined();
    expect(out.config).not.toHaveProperty(CLIENT_WORD_EDIT_KEY);
  });
});
