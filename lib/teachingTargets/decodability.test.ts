import { describe, expect, it } from 'vitest';
import {
  decodabilitySummary,
  describeMissingUnit,
  describeOtherFinding,
  groupDecodability,
  pointStageNote,
  sortStories,
  type DecodabilityFinding,
  type DecodabilityReport,
  type StoryDecodability,
} from './decodability';

const letter = (id: string) =>
  ({ ba: { char: 'ب', name: 'Ba' }, ta: { char: 'ت', name: 'Ta' } } as Record<string, { char: string; name: string }>)[id];

const untaught = (wordId: string, text: string, unit: string, over: Partial<DecodabilityFinding> = {}): DecodabilityFinding => ({
  code: 'prerequisite_untaught',
  wordId,
  text,
  positions: [0],
  unit,
  relation: 'untaught',
  stage: null,
  message: 'server message',
  ...over,
});

const report = (findings: DecodabilityFinding[], over: Partial<DecodabilityReport> = {}): DecodabilityReport => ({
  scope: 'story',
  sequenceId: 'default',
  pointStage: 'fatha',
  decodable: findings.length === 0,
  heartWords: [],
  findings,
  ...over,
});

describe('grouping by failing word', () => {
  it('collects each word once with every unit it misses, in first-seen order', () => {
    const g = groupDecodability([
      untaught('bint', 'بِنْت', 'sound:ba:kasra', { relation: 'preview', stage: 'kasra' }),
      untaught('bab', 'بابٌ', 'rule:tanween_damm', { stage: 'tanween' }),
      untaught('bint', 'بِنْت', 'rule:sukoon', { stage: 'sukoon' }),
      untaught('bint', 'بِنْت', 'rule:sukoon', { stage: 'sukoon' }),
      { code: 'word_unknown', wordId: 'gone', positions: [3], message: 'm' },
    ]);
    expect(g.words.map((w) => [w.wordId, w.missing.map((m) => m.unit)])).toEqual([
      ['bint', ['sound:ba:kasra', 'rule:sukoon']],
      ['bab', ['rule:tanween_damm']],
    ]);
    expect(g.words[0].missing[0]).toEqual({ unit: 'sound:ba:kasra', relation: 'preview', stage: 'kasra' });
    expect(g.other.map((f) => f.code)).toEqual(['word_unknown']);
  });

  it('keeps the heart word the backend names', () => {
    const g = groupDecodability([untaught('hadha', 'هٰذا', 'rule:madd_dagger', { heartWord: 'hadha' })]);
    expect(g.words[0].heartWord).toBe('hadha');
  });
});

describe('plain language', () => {
  it('names the unit, preview or untaught, and the stage that teaches it', () => {
    expect(describeMissingUnit({ unit: 'sound:ba:kasra', relation: 'preview', stage: 'kasra' }, letter)).toBe(
      'ب (Ba) with kasra: a later lesson teaches it (stage Kasra)',
    );
    expect(describeMissingUnit({ unit: 'letter:ta', relation: 'untaught', stage: null }, letter)).toBe(
      'ت (Ta): nothing in this curriculum teaches it yet',
    );
  });

  it('describes typed Arabic, unknown words and a missing teaching point', () => {
    expect(describeOtherFinding({ code: 'free_arabic_text', text: 'قِطّ', path: 'pages.0.text', message: 'm' })).toContain(
      '"قِطّ" at pages.0.text is typed Arabic',
    );
    expect(describeOtherFinding({ code: 'word_unknown', wordId: 'w9', message: 'm' })).toBe(
      'Word w9 is not in the word bank, so it cannot be checked.',
    );
    expect(describeOtherFinding({ code: 'no_teaching_point', message: 'm' })).toBe(
      'This is in no topic, so nothing is taught there.',
    );
  });
});

describe('report headline', () => {
  it('says when there is nothing to check, when it passes, and what fails', () => {
    expect(decodabilitySummary(null)).toMatch(/no saved reader source/);
    expect(decodabilitySummary(report([]))).toMatch(/^Decodable here/);
    expect(
      decodabilitySummary(report([], { heartWords: [{ wordId: 'hadha', heartWord: 'hadha', kind: 'early' }] })),
    ).toBe('Decodable here, with 1 heart word excused.');
    expect(
      decodabilitySummary(
        report([
          untaught('a', 'أ', 'letter:alif'),
          untaught('b', 'ب', 'letter:ba'),
          { code: 'free_arabic_text', text: 'x', message: 'm' },
        ]),
      ),
    ).toBe(
      'For information: 2 words use what is not taught yet, 1 other problem. Fine if the words are age appropriate.',
    );
  });

  it('notes a missing level stage only when the report fails because of it', () => {
    expect(pointStageNote(report([untaught('a', 'أ', 'letter:alif')], { pointStage: null }))).toMatch(/stage label/);
    expect(pointStageNote(report([untaught('a', 'أ', 'letter:alif')]))).toBeNull();
    expect(pointStageNote(report([], { pointStage: null }))).toBeNull();
    expect(pointStageNote(null)).toBeNull();
  });
});

describe('story order', () => {
  it('lists failing books first and keeps the roll-up order otherwise', () => {
    const s = (id: string, r: DecodabilityReport | null): StoryDecodability => ({
      node_id: id,
      topic_id: 't',
      book_id: `b-${id}`,
      report: r,
    });
    const sorted = sortStories([
      s('ok', report([])),
      s('none', null),
      s('bad1', report([untaught('a', 'أ', 'letter:alif')])),
      s('bad2', report([untaught('b', 'ب', 'letter:ba')])),
    ]);
    expect(sorted.map((x) => x.node_id)).toEqual(['bad1', 'bad2', 'ok', 'none']);
  });
});
