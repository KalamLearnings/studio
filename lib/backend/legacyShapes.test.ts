import { describe, it, expect } from 'vitest';
import {
  BACKEND_CAPABILITIES,
  CONTENT_MODEL,
  LEGACY,
  backendCapabilitiesFor,
} from './capabilities';
import { legacySoundBlendWord, prepareActivitySave, toBackendShape } from './legacyShapes';
import { openForEdit, toSaveConfig } from '../activityConfig/canonical';
import { CLIENT_WORD_EDIT_KEY, toBlendSaveParts } from '../blendWord/config';
import { changeSpeed, soundBlendWordEditor } from '../soundBlend/editor';
import { withLetterBlend } from '../soundBlend/letterMode';
import { convertToWordModel, pickWord } from '../wordSplitBlend/config';
import { withPickedWord } from '../activityConfig/wordRef';
import { mcqOptionFromItem, cardFromItem, pairSideFromItem } from '../activityConfig/contentItems';

type Config = Record<string, unknown>;

const PROD = backendCapabilitiesFor('prod');
const DEV = backendCapabilitiesFor('dev');

/** The form's open-edit-save round trip, as `ActivityForm` runs it. */
function openAndSave(
  type: string,
  stored: Config,
  edit: (config: Config) => Config,
  caps = PROD,
): { config: Config; wordBlendEdit?: unknown } {
  const opened = openForEdit(type, stored, { canonical: caps.canonicalConfigs });
  return prepareActivitySave(type, edit(opened.config), { canonical: opened.canonical, caps });
}

/** The save before the PROD gate (`toBlendSaveParts(toSaveConfig(...))`), for the dev comparison. */
function oldSave(type: string, stored: Config, edit: (config: Config) => Config) {
  const opened = openForEdit(type, stored);
  return toBlendSaveParts(type, toSaveConfig(type, edit(opened.config), opened.canonical));
}

const same = (c: Config) => c;

// Isolated presentation forms, as the segmented reading mode stores them.
const ISO_NUN = 'ﻥ';
const ISO_ZAH = 'ﻅ';
const ISO_RA = 'ﺭ';
const FATHA = 'َ';

describe('backend capabilities per environment', () => {
  it('PROD is the legacy backend and dev has the content model', () => {
    expect(BACKEND_CAPABILITIES.prod).toBe(LEGACY);
    expect(BACKEND_CAPABILITIES.dev).toBe(CONTENT_MODEL);
    expect(Object.values(PROD).every((v) => v === false)).toBe(true);
    expect(Object.values(DEV).every((v) => v === true)).toBe(true);
  });

  it('an unknown environment fails closed', () => {
    expect(backendCapabilitiesFor('staging')).toBe(LEGACY);
    expect(backendCapabilitiesFor(undefined)).toBe(LEGACY);
    expect(backendCapabilitiesFor('toString')).toBe(LEGACY);
  });
});

describe('sound_blend on PROD', () => {
  // activity_1776994330293 as the old PROD backend stored it
  const broken = {
    ending: 'full',
    stages: ['together', 'togetherFast', 'alone'],
    wordRef: { text: 'نَظَرَ' },
    contentType: 'word',
    blendVersion: 2,
    requiredSlides: 1,
    showBothSpeeds: true,
  };
  const legacyRow = {
    word: 'ظَمَرَ',
    segments: [
      { sound: ISO_ZAH + FATHA, duration: 2 },
      { sound: 'ﻡ' + FATHA, duration: 2 },
      { sound: ISO_RA + FATHA, duration: 2 },
    ],
    requiredSlides: 1,
    showBothSpeeds: true,
  };

  it('a word edit saves word and segments from the shared splitter, no word-model field', () => {
    const { config, wordBlendEdit } = openAndSave('sound_blend', legacyRow, (c) =>
      soundBlendWordEditor.changeWord(c, 'نَظَرَ'),
    );
    expect(wordBlendEdit).toBeUndefined();
    expect(config).toEqual({
      word: 'نَظَرَ',
      segments: [
        { sound: ISO_NUN + FATHA, duration: 2 },
        { sound: ISO_ZAH + FATHA, duration: 2 },
        { sound: ISO_RA + FATHA, duration: 2 },
      ],
      requiredSlides: 1,
      showBothSpeeds: true,
      contentType: 'word',
    });
    for (const key of ['blendVersion', 'wordRef', 'stages', 'ending', CLIENT_WORD_EDIT_KEY]) {
      expect(config).not.toHaveProperty(key);
    }
  });

  it('the broken v2 row re-saves in the legacy shape, keeping its v1 settings', () => {
    const { config } = openAndSave('sound_blend', broken, same);
    expect(config).toEqual({
      contentType: 'word',
      requiredSlides: 1,
      showBothSpeeds: true,
      word: 'نَظَرَ',
      segments: [
        { sound: ISO_NUN + FATHA, duration: 2 },
        { sound: ISO_ZAH + FATHA, duration: 2 },
        { sound: ISO_RA + FATHA, duration: 2 },
      ],
    });
  });

  it('a connected reading mode keeps the joined glyphs, and durations follow sukoon and madd', () => {
    const v2 = soundBlendWordEditor.changeWord({ speed: 'fluent' }, 'كِتَابْ');
    expect(toBackendShape('sound_blend', v2, PROD)).toMatchObject({
      speed: 'fluent',
      word: 'كِتَابْ',
      segments: [
        { sound: 'كِ', duration: 2 },
        { sound: 'تَ', duration: 3 },
        { sound: 'ا', duration: 2 },
        { sound: 'بْ', duration: 1 },
      ],
    });
    // a reading-mode change after the word edit re-derives the glyphs on save
    expect(toBackendShape('sound_blend', changeSpeed(v2, 'segmented'), PROD).segments).toEqual(
      legacySoundBlendWord('كِتَابْ', 'segmented')!.segments,
    );
  });

  it('a pseudo-word or override edit sends no wordBlendEdit (PROD has no such column)', () => {
    const v2 = soundBlendWordEditor.changePseudo(soundBlendWordEditor.changeWord({}, 'نَظَرَ'), true);
    expect(v2[CLIENT_WORD_EDIT_KEY]).toEqual({ isPseudo: true });
    const saved = prepareActivitySave('sound_blend', v2, { canonical: false, caps: PROD });
    expect(saved.wordBlendEdit).toBeUndefined();
    expect(saved.config).not.toHaveProperty(CLIENT_WORD_EDIT_KEY);
  });

  it('a letter pick saves the glyph and its segment, without blendVersion or targetLetter', () => {
    const letterRow = { contentType: 'letter', word: 'بَ', segments: [{ sound: 'بَ', duration: 2 }], speed: 'none' };
    const { config } = openAndSave('sound_blend', letterRow, (c) =>
      withLetterBlend(c, { letterId: 'ta', form: 'isolated', haraka: 'kasra' }, {
        glyph: 'تِ',
        segment: { sound: 'تِ', duration: 2 },
      }),
    );
    expect(config).toEqual({ contentType: 'letter', word: 'تِ', segments: [{ sound: 'تِ', duration: 2 }], speed: 'none' });
  });

  it('an untouched legacy row saves back unchanged', () => {
    expect(openAndSave('sound_blend', legacyRow, same).config).toEqual(legacyRow);
    const showBoth = { ...legacyRow, showBothSpeeds: false };
    expect(openAndSave('sound_blend', legacyRow, (c) => ({ ...c, showBothSpeeds: false })).config).toEqual(showBoth);
  });
});

describe('word_split_blend on PROD', () => {
  const legacyRow = {
    word: 'مَدْرَسَة',
    chunks: [{ text: 'مَدْ' }, { text: 'رَ' }, { text: 'سَة' }],
    meaning: 'school',
  };

  it('an untouched legacy row saves back unchanged', () => {
    expect(openAndSave('word_split_blend', legacyRow, same).config).toEqual(legacyRow);
  });

  it('a v2 row (or a converted one) saves word, wordId and chunks without the word-model fields', () => {
    const v2 = convertToWordModel({ ...legacyRow, wordId: 'word_1' });
    expect(v2.blendVersion).toBe(2);
    expect(toBackendShape('word_split_blend', v2, PROD)).toEqual({
      ...legacyRow,
      wordId: 'word_1',
    });
  });

  it('a word picked on the word model keeps the library id', () => {
    const v2 = pickWord({ chunks: legacyRow.chunks }, 'مَدْرَسَة', { id: 'word_2', english: 'school' });
    expect(toBackendShape('word_split_blend', v2, PROD)).toEqual({
      chunks: legacyRow.chunks,
      meaning: 'school',
      word: 'مَدْرَسَة',
      wordId: 'word_2',
    });
  });

  it('a hand-edited word wins over a stale reference', () => {
    const stale = { blendVersion: 2, wordRef: { wordId: 'word_1', text: 'مَدْرَسَة' }, word: 'قَلَم', chunks: [] };
    expect(toBackendShape('word_split_blend', stale, PROD)).toEqual({ word: 'قَلَم', chunks: [] });
  });
});

describe('wordRef forms on PROD (build, show, tap)', () => {
  const picked = { id: 'word_9', arabic: 'نَار' };

  it('build_word_from_letters sends targetWord, not wordRef', () => {
    const { config } = openAndSave('build_word_from_letters', { letterDisplayMode: 'isolated' }, (c) =>
      withPickedWord(c, 'targetWord', 'نَار', picked),
    );
    expect(config).toEqual({ letterDisplayMode: 'isolated', targetWord: 'نَار' });
  });

  it('tap_letter_in_word sends targetWord, not wordRef', () => {
    const { config } = openAndSave('tap_letter_in_word', { targetIndices: [] }, (c) =>
      withPickedWord(c, 'targetWord', 'نَار', picked),
    );
    expect(config).toEqual({ targetIndices: [], targetWord: 'نَار' });
  });

  it('show_letter_or_word word mode sends word, not wordRef (no canonical cut)', () => {
    const stored = { contentType: 'word', word: 'نَاس', targetLetter: { form: 'isolated', letterId: 'alif' } };
    const { config } = openAndSave('show_letter_or_word', stored, (c) => withPickedWord(c, 'word', 'نَار', picked));
    expect(config).toEqual({ ...stored, word: 'نَار' });
    // a new word activity on dev saves the reference only (the server writes `word`); on PROD the word
    const fresh = (c: Config) => withPickedWord({ ...c, contentType: 'word' }, 'word', 'نَار', picked);
    expect(openAndSave('show_letter_or_word', {}, fresh).config).toEqual({ contentType: 'word', word: 'نَار' });
    const dev = openAndSave('show_letter_or_word', {}, fresh, DEV);
    expect(dev.config).toMatchObject({ wordRef: { wordId: 'word_9' } });
    expect(dev.config).not.toHaveProperty('word');
  });

  it('a row with only a reference text still saves the text v1 draws', () => {
    expect(toBackendShape('build_word_from_letters', { wordRef: { wordId: 'w', text: 'بَاب' } }, PROD)).toEqual({
      targetWord: 'بَاب',
    });
  });

  it('untouched legacy rows save back unchanged', () => {
    const build = { targetWord: 'نَار', wordMeaning: { ar: '', en: '' }, letterDisplayMode: 'isolated' };
    const tap = { targetWord: 'كِتَابُ', targetCount: 1, wordMeaning: '', targetLetter: { form: 'isolated', letterId: 'alif' }, targetIndices: [2] };
    expect(openAndSave('build_word_from_letters', build, same).config).toEqual(build);
    expect(openAndSave('tap_letter_in_word', tap, same).config).toEqual(tap);
  });
});

describe('answer sets on PROD (MCQ, cards, match pairs)', () => {
  const wordItem = { kind: 'word' as const, id: 'o1', isCorrect: true, word: { wordId: 'word_3', text: 'بَاب' } };
  const letterItem = { kind: 'letter' as const, id: 'o2', isCorrect: false, letter: { letterId: 'ba', form: 'isolated' as const } };

  it('a new MCQ of library words and letters saves v1 option text and mode, no prompt or word refs', () => {
    const { config } = openAndSave('multiple_choice_question', {}, () => ({
      mode: 'word',
      question: { en: '', ar: 'بَاب' },
      prompt: { kind: 'word_recognition', target: { kind: 'word', word: { wordId: 'word_3', text: 'بَاب' } } },
      options: [mcqOptionFromItem(wordItem), mcqOptionFromItem(letterItem)],
    }));
    expect(config).toEqual({
      mode: 'word',
      question: { en: '', ar: 'بَاب' },
      options: [
        { id: 'o1', isCorrect: true, text: { en: '', ar: 'بَاب' } },
        { id: 'o2', isCorrect: false, text: { en: '', ar: '' }, letter: { letterId: 'ba', form: 'isolated' } },
      ],
    });
  });

  it('content_with_cards keeps card text, drops prompt and word refs', () => {
    const { config } = openAndSave('content_with_cards', {}, () => ({
      contentType: 'letter',
      prompt: { kind: 'letter_recognition' },
      cards: [cardFromItem(wordItem)],
    }));
    expect(config).toEqual({ contentType: 'letter', cards: [{ id: 'o1', text: 'بَاب', isCorrect: true }] });
  });

  it('match_pairs keeps side type and value, drops prompt and word refs', () => {
    const glyph = () => 'ب';
    const { config } = openAndSave('match_pairs', {}, () => ({
      prompt: { kind: 'letter_recognition' },
      pairs: [{ left: pairSideFromItem(letterItem, glyph), right: pairSideFromItem(wordItem, glyph) }],
    }));
    expect(config).toEqual({
      pairs: [{
        left: { type: 'letter', value: 'ب', letterId: 'ba', form: 'isolated' },
        right: { type: 'word', value: 'بَاب' },
      }],
    });
  });

  it('a match_pairs row with a URL-only clip saves its URL, with no asset id, in PROD and dev', () => {
    const stored = {
      pairs: [
        { left: { kind: 'letter', letter: { letterId: 'ba', form: 'isolated' } }, right: { kind: 'audio', audio: { url: 'https://x/ba.mp3' } } },
        { left: { kind: 'letter', letter: { letterId: 'ta', form: 'isolated' } }, right: { kind: 'audio', audio: { url: 'https://x/ta.mp3' } } },
      ],
    };
    for (const caps of [PROD, DEV]) {
      const { config } = openAndSave('match_pairs', stored, same, caps);
      const rights = (config.pairs as Config[]).map((p) => p.right);
      expect(rights).toEqual([
        { type: 'audio', value: 'https://x/ba.mp3', audioUrl: 'https://x/ba.mp3' },
        { type: 'audio', value: 'https://x/ta.mp3', audioUrl: 'https://x/ta.mp3' },
      ]);
      expect(JSON.stringify(config)).not.toContain('assetId');
    }
  });

  it('a PROD MCQ row (v1 shape) saves back unchanged', () => {
    const stored = {
      mode: 'letter',
      options: [
        { id: 'option_0', text: { ar: '', en: '' }, letter: { form: 'isolated', letterId: 'lam' }, isCorrect: false },
        { id: 'option_1', text: { ar: '', en: '' }, letter: { form: 'isolated', letterId: 'ba' }, isCorrect: true },
      ],
      question: { en: '', ar: 'ل' },
    };
    expect(openAndSave('multiple_choice_question', stored, same).config).toEqual(stored);
  });
});

describe('letter references on PROD (madd, contrast)', () => {
  it('drops madd from every letter reference and a picked contrast from distractors', () => {
    const config = {
      targetLetter: [{ letterId: 'ba', form: 'isolated', haraka: 'fatha', madd: true }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated', haraka: 'fatha', contrast: 'dots' }],
    };
    expect(toBackendShape('pop_balloons_with_letter', config, PROD)).toEqual({
      targetLetter: [{ letterId: 'ba', form: 'isolated', haraka: 'fatha' }],
      distractorLetters: [{ letterId: 'ta', form: 'isolated', haraka: 'fatha' }],
    });
  });

  it('a PROD hunt row saves back unchanged', () => {
    const stored = {
      targetLetter: [{ form: 'isolated', haraka: 'shadda_kasra', letterId: 'ra' }],
      distractorLetters: [{ form: 'isolated', haraka: 'shadda_fatha', letterId: 'ra' }],
    };
    expect(openAndSave('pop_balloons_with_letter', stored, same).config).toEqual(stored);
  });
});

describe('dev keeps today\'s save', () => {
  const cases: Array<[string, Config, (c: Config) => Config]> = [
    ['sound_blend', { word: 'ظَمَرَ', segments: [], showBothSpeeds: true }, (c) => soundBlendWordEditor.changePseudo(soundBlendWordEditor.changeWord(c, 'نَظَرَ'), true)],
    ['sound_blend', { contentType: 'letter' }, (c) => withLetterBlend(c, { letterId: 'ba', form: 'isolated' }, { glyph: 'ب', segment: { sound: 'ب', duration: 2 } })],
    ['word_split_blend', { word: 'مَدْرَسَة', chunks: [{ text: 'مَدْ' }, { text: 'رَسَة' }] }, (c) => convertToWordModel(c)],
    ['build_word_from_letters', {}, (c) => withPickedWord(c, 'targetWord', 'نَار', { id: 'w', arabic: 'نَار' })],
    ['show_letter_or_word', { contentType: 'word' }, (c) => withPickedWord(c, 'word', 'نَار', { id: 'w', arabic: 'نَار' })],
    ['pop_balloons_with_letter', {}, () => ({ targetLetter: [{ letterId: 'ba', form: 'isolated', haraka: 'fatha', madd: true }] })],
    ['multiple_choice_question', {}, () => ({ prompt: { kind: 'letter_recognition' }, options: [{ id: 'a', kind: 'letter', letter: { letterId: 'ba', form: 'isolated' }, isCorrect: true }] })],
  ];

  it.each(cases)('%s saves exactly as before the gate', (type, stored, edit) => {
    expect(openAndSave(type, stored, edit, DEV)).toEqual(oldSave(type, stored, edit));
  });

  it('the word edit still travels beside config on dev', () => {
    const v2 = soundBlendWordEditor.changePseudo(soundBlendWordEditor.changeWord({}, 'نَظَرَ'), true);
    expect(prepareActivitySave('sound_blend', v2, { canonical: false, caps: DEV })).toMatchObject({
      config: { blendVersion: 2, wordRef: { text: 'نَظَرَ' } },
      wordBlendEdit: { isPseudo: true },
    });
  });
});
