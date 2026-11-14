import { describe, it, expect } from 'vitest';
import {
  confirmHarakatSuggestion,
  harakatErrorView,
  harakatSuggestionReason,
  markChangedLetters,
  offerMatchesWord,
  suggestHarakatRequest,
  toHarakatOffer,
  type HarakatCandidate,
  type SuggestHarakatResponse,
} from './harakat';
import { buildWordPreview } from './preview';
import { changePseudo, changeWord, splitFormUnit } from './editor';
import { wordEditOf } from './config';

const candidate = (text: string, over: Partial<HarakatCandidate> = {}): HarakatCandidate => ({
  text,
  pausal: text,
  confidence: 0.9,
  valid: true,
  flags: [],
  issues: [],
  ...over,
});

describe('suggestHarakatRequest', () => {
  it('sends the normalised word', () => {
    expect(suggestHarakatRequest('  كتاب ')).toEqual({ texts: ['كتاب'] });
  });
});

describe('harakatSuggestionReason', () => {
  it('offers it when letters have no haraka', () => {
    expect(harakatSuggestionReason(buildWordPreview('كتاب'), 'pausal')).toMatch(/no haraka/);
  });

  it('offers it for a pausal-only word when the activity uses the full ending', () => {
    const preview = buildWordPreview('قَمَرْ');
    expect(preview.fullKnown).toBe(false);
    expect(harakatSuggestionReason(preview, 'full')).toMatch(/full ending/);
    expect(harakatSuggestionReason(preview, 'pausal')).toBeNull();
  });

  it('does not offer it for a complete word or no word', () => {
    expect(harakatSuggestionReason(buildWordPreview('كِتَابٌ'), 'full')).toBeNull();
    expect(harakatSuggestionReason(buildWordPreview('كِتَابٌ'), 'pausal')).toBeNull();
    expect(harakatSuggestionReason(null, 'full')).toBeNull();
  });
});

describe('markChangedLetters', () => {
  it('marks the letters whose marks the suggestion adds', () => {
    const out = markChangedLetters('كِتاب', 'كِتَابٌ');
    expect(out.map((l) => l.letter).join('')).toBe('كتاب');
    expect(out.map((l) => l.changed)).toEqual([false, true, false, true]);
  });

  it('marks the replaced pausal sukoon', () => {
    const out = markChangedLetters('قَمَرْ', 'قَمَرٌ');
    expect(out.map((l) => l.changed)).toEqual([false, false, true]);
  });

  it('marks every letter when the letters differ', () => {
    expect(markChangedLetters('كتب', 'كَاتِبٌ').every((l) => l.changed)).toBe(true);
  });
});

describe('toHarakatOffer', () => {
  const respond = (item: Partial<SuggestHarakatResponse['items'][number]>): SuggestHarakatResponse => ({
    items: [{ text: 'كتاب', status: 'suggested', suggestion: null, alternatives: [], ...item }],
  });

  it('lists the suggestion first, then the alternatives, each with its split', () => {
    const offer = toHarakatOffer(
      respond({
        suggestion: candidate('كِتَابٌ', { pausal: 'كِتَابْ' }),
        alternatives: [candidate('كُتَّابٌ', { confidence: 0.2 })],
      }),
      'كتاب',
      'pausal',
    );
    expect(offer?.kind).toBe('options');
    if (offer?.kind !== 'options') return;
    expect(offer.options.map((o) => o.text)).toEqual(['كِتَابٌ', 'كُتَّابٌ']);
    expect(offer.options[0].best).toBe(true);
    expect(offer.options[0].confidencePercent).toBe(90);
    // the activity's form (pausal) is split by the shared splitter
    expect(offer.options[0].split.form).toBe('pausal');
    expect(offer.options[0].split.units.map((u) => u.text)).toEqual(['كِ', 'تَابْ']);
    expect(offer.options[0].letters.map((l) => l.changed)).toEqual([true, true, false, true]);
  });

  it('shows the full form split when the activity uses the full ending', () => {
    const offer = toHarakatOffer(respond({ suggestion: candidate('كِتَابٌ') }), 'كتاب', 'full');
    if (offer?.kind !== 'options') throw new Error('expected options');
    expect(offer.options[0].split.form).toBe('full');
    expect(offer.options[0].split.text).toBe('كِتَابٌ');
  });

  it('no_valid_suggestion: flagged readings, with their flags in plain words', () => {
    const offer = toHarakatOffer(
      respond({
        status: 'no_valid_suggestion',
        alternatives: [candidate('كَاتِبٌ', { valid: false, flags: ['letters_changed'] })],
      }),
      'كتاب',
      'pausal',
    );
    expect(offer?.kind).toBe('none');
    if (offer?.kind !== 'none') return;
    expect(offer.options[0].valid).toBe(false);
    expect(offer.options[0].problems[0].message).toMatch(/changes the letters/);
  });

  it('never offers an invalid reading as the suggestion', () => {
    const offer = toHarakatOffer(
      respond({ suggestion: candidate('كِتَابٌ', { valid: false, flags: ['split_invalid'] }) }),
      'كتاب',
      'pausal',
    );
    expect(offer?.kind).toBe('none');
  });

  it('complete: nothing to suggest', () => {
    expect(toHarakatOffer(respond({ status: 'complete' }), 'كتاب', 'pausal')?.kind).toBe('complete');
  });

  it('a malformed response is no offer; malformed candidates are dropped', () => {
    expect(toHarakatOffer(null, 'كتاب', 'pausal')).toBeNull();
    expect(toHarakatOffer({ items: [] }, 'كتاب', 'pausal')).toBeNull();
    const offer = toHarakatOffer(
      respond({ suggestion: candidate('كِتَابٌ'), alternatives: [{ bad: 1 } as unknown as HarakatCandidate] }),
      'كتاب',
      'pausal',
    );
    expect(offer?.kind === 'options' && offer.options.length).toBe(1);
  });

  it('belongs only to the word it was asked for', () => {
    const offer = toHarakatOffer(respond({ status: 'complete' }), 'كتاب', 'pausal');
    expect(offerMatchesWord(offer, ' كتاب')).toBe(true);
    expect(offerMatchesWord(offer, 'قلم')).toBe(false);
    expect(offerMatchesWord(null, 'كتاب')).toBe(false);
  });
});

describe('harakatErrorView', () => {
  it('switch off: turned off, and the action is disabled', () => {
    expect(harakatErrorView({ code: 'SPEND_DISABLED', status: 503 })).toEqual({
      message: 'Harakat suggestions are turned off.',
      retry: false,
      disable: true,
    });
  });

  it('budget used up', () => {
    const v = harakatErrorView({ code: 'SPEND_BUDGET_EXCEEDED', status: 503 });
    expect(v.message).toMatch(/budget/);
    expect(v.disable).toBe(true);
  });

  it('rate limited: try again', () => {
    const v = harakatErrorView({ code: 'PROVIDER_RATE_LIMITED', status: 429 });
    expect(v.message).toMatch(/try again/);
    expect(v.retry).toBe(true);
    expect(v.disable).toBe(false);
  });

  it('anything else: a retryable plain message', () => {
    expect(harakatErrorView(new Error('boom')).retry).toBe(true);
    expect(harakatErrorView({ status: 403 }).disable).toBe(true);
  });
});

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
});
