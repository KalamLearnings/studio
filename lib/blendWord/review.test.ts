import { describe, it, expect } from 'vitest';
import {
  aiCheckErrorView,
  aiCheckSummary,
  audioUnavailableReason,
  filterCounts,
  filterQueue,
  findReviewWord,
  harakatSourceLabel,
  overrideDiff,
  pseudoProposals,
  qaFlagView,
  reviewFormPreview,
  sortedForms,
  splitReviewBody,
  splitReviewLine,
  type BlendReviewForm,
  type BlendReviewWord,
} from './review';
import type { BlendReviewTake } from './takes';

const take = (status: BlendReviewTake['status'], current = true): BlendReviewTake => ({
  id: `t-${status}`,
  kind: 'natural',
  source: 'generated',
  status,
  current,
  url: null,
  durationMs: null,
  marks: null,
  phases: null,
  qaFlags: [],
  error: null,
  attempts: 1,
  voiceId: null,
  settings: null,
  request: null,
  reviewedBy: null,
  reviewedAt: null,
  createdAt: '',
});

function form(over: Partial<BlendReviewForm> = {}): BlendReviewForm {
  return {
    form: 'pausal',
    vowelisedText: 'كِتَابْ',
    units: [
      { id: 'u0', text: 'كِ', kind: 'cv', tags: [] },
      { id: 'u1', text: 'تَابْ', kind: 'cvvc', tags: ['sukoon', 'madd', 'qalqala'] },
    ],
    splitterVersion: '1',
    override: false,
    reviewStatus: 'ready',
    harakatSource: 'author',
    qaFlags: [],
    aiCheckedAt: null,
    review: null,
    takes: [],
    ...over,
  };
}

const word = (id: string, forms: BlendReviewForm[], isPseudo = false): BlendReviewWord => ({
  wordId: id,
  word: { arabic: 'كِتَابٌ', english: 'book', isPseudo, usageCount: 2 },
  forms,
});

describe('queue filters', () => {
  const items = [
    word('split', [form({ reviewStatus: 'needs_review' })]),
    word('take', [form({ takes: [take('needs_review')] })]),
    word('failed', [form({ takes: [take('failed')] })]),
    word('nv', [form({ form: 'full', takes: [take('not_voiceable')] })]),
    word('old', [form({ takes: [take('failed', false)] })]),
  ];
  it('filters by what waits', () => {
    expect(filterQueue(items, 'needs_review').map((w) => w.wordId)).toEqual(['split', 'take']);
    expect(filterQueue(items, 'failed').map((w) => w.wordId)).toEqual(['failed']);
    expect(filterQueue(items, 'not_voiceable').map((w) => w.wordId)).toEqual(['nv']);
    expect(filterCounts(items)).toEqual({ all: 5, needs_review: 2, failed: 1, not_voiceable: 1 });
  });
  it('finds a word and sorts its forms', () => {
    expect(findReviewWord({ items }, 'nv')?.wordId).toBe('nv');
    expect(findReviewWord({ items }, undefined)).toBeNull();
    expect(sortedForms(word('w', [form({ form: 'full' }), form()])).map((f) => f.form)).toEqual(['pausal', 'full']);
  });
});

describe('the stored split', () => {
  it('shows the stored units with their kinds and tags', () => {
    const p = reviewFormPreview(form());
    expect(p.units.map((u) => u.text)).toEqual(['كِ', 'تَابْ']);
    expect(p.units[1].kind).toBe('cvvc');
    expect(p.units[1].tags.map((t) => t.label)).toEqual(['sukoon join', 'madd', 'qalqala']);
    expect(p.overridden).toBe(false);
    expect(overrideDiff(form())).toBeNull();
  });
  it('diffs an override against the splitter', () => {
    const edited = form({ override: true, units: [{ text: 'كِتَا', tags: [] }, { text: 'بْ', tags: [] }] });
    const diff = overrideDiff(edited);
    expect(diff).toEqual({ splitter: ['كِ', 'تَابْ'], stored: ['كِتَا', 'بْ'], changed: [true, true] });
    const p = reviewFormPreview(edited);
    expect(p.overridden).toBe(true);
    expect(p.issues.length).toBeGreaterThan(0);
  });
});

describe('flags in plain words', () => {
  it('names a rule flag and its pseudo-word reasons', () => {
    const v = qaFlagView({
      code: 'likely_pseudo',
      source: 'rule',
      severity: 'review',
      message: 'this may be a pseudo-word; mark it if it is',
      detail: 'repeated_letter,short_without_meaning',
    });
    expect(v.title).toBe('May be a practice word');
    expect(v.source).toBe('Rule');
    expect(v.message).toBe(
      'This may be a pseudo-word; mark it if it is. Why: one letter repeated; a very short word with no meaning in the library.',
    );
  });
  it('shows an AI flag with its confidence, syllable and suggestion', () => {
    const v = qaFlagView(
      { code: 'ai_suspicious_marks', source: 'ai', severity: 'review', message: 'the kasra looks wrong', unit: 0, confidence: 0.82, suggestion: 'كَتَابٌ' },
      [{ text: 'كِ' }],
    );
    expect(v).toEqual({
      title: 'AI: the marks look wrong',
      message: 'The kasra looks wrong (syllable "كِ").',
      source: 'AI, 82% sure',
      blocking: true,
      suggestion: 'كَتَابٌ',
    });
  });
  it('lists pseudo-word proposals once per source, none for a practice word', () => {
    const flags = [
      { code: 'likely_pseudo', source: 'rule' as const, severity: 'review' as const, message: 'x' },
      { code: 'ai_likely_pseudo', source: 'ai' as const, severity: 'review' as const, message: 'y', confidence: 0.9 },
    ];
    const w = word('w', [form({ qaFlags: flags }), form({ form: 'full', qaFlags: flags })]);
    expect(pseudoProposals(w).map((p) => p.source)).toEqual(['Rule', 'AI, 90% sure']);
    expect(pseudoProposals(word('w', [form({ qaFlags: flags })], true))).toEqual([]);
  });
  it('labels the harakat source', () => {
    expect(harakatSourceLabel('suggested_confirmed')).toBe('Suggested, confirmed by the author');
    expect(harakatSourceLabel('nope')).toBe('Unknown');
  });
});

describe('split review', () => {
  it('needs a note to reject', () => {
    expect(splitReviewBody('rejected', ' ')).toEqual({ ok: false, error: 'Say why the split is wrong in the note.' });
    expect(splitReviewBody('rejected', 'wrong unit')).toEqual({ ok: true, body: { decision: 'rejected', note: 'wrong unit' } });
    expect(splitReviewBody('approved', '')).toEqual({ ok: true, body: { decision: 'approved' } });
    expect(splitReviewBody('approved', 'x'.repeat(501)).ok).toBe(false);
  });
  it('describes the review state', () => {
    expect(splitReviewLine(form({ reviewStatus: 'needs_review' }))).toBe('The split waits for review.');
    expect(
      splitReviewLine(form({ review: { decision: 'approved', by: 'a', at: 'b', note: null, current: false } })),
    ).toBe('Approved. The split or its flags changed since, so it needs review again.');
  });
});

describe('AI check', () => {
  it('summarises the batch', () => {
    expect(aiCheckSummary({ estimate: null, items: [] })).toBe('There was nothing to check.');
    expect(
      aiCheckSummary({
        estimate: null,
        items: [
          { wordId: 'a', text: null, status: 'flagged', forms: [], flags: [] },
          { wordId: 'b', text: null, status: 'clear', forms: [], flags: [] },
          { wordId: 'c', text: null, status: 'no_answer', forms: [], flags: [] },
        ],
      }),
    ).toBe('Checked 3 words: 1 flagged, 1 clear, 1 with no answer.');
  });
  it('handles the gated 503 cleanly', () => {
    expect(aiCheckErrorView({ status: 503, code: 'SPEND_DISABLED' })).toEqual({ message: 'The AI check is turned off.', disable: true });
    expect(aiCheckErrorView({ status: 503, code: 'SPEND_BUDGET_EXCEEDED' }).disable).toBe(true);
    expect(aiCheckErrorView({ status: 429, code: 'PROVIDER_RATE_LIMITED' }).disable).toBe(false);
  });
});

describe('audioUnavailableReason', () => {
  it('asks for a save before audio', () => {
    expect(audioUnavailableReason(undefined, false)).toMatch(/Save the activity first/);
    expect(audioUnavailableReason('w', true)).toMatch(/saved word/);
    expect(audioUnavailableReason('w', false)).toBeNull();
  });
});
