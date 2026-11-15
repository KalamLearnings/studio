import { describe, expect, it } from 'vitest';
import {
  awaitsReadsAs,
  familyErrorText,
  isNotReviewed,
  isSlug,
  joinableWords,
  readsAsCandidates,
  skeleton,
  slugFromText,
  vowelStatus,
} from './family';

const word = (id: string, arabic: string, over: Record<string, unknown> = {}) => ({
  id,
  arabic,
  english: null,
  is_pseudo: false,
  usage_count: 0,
  family_id: null,
  reads_as_id: null,
  retired_at: null,
  reviewed_at: null,
  reviewed_by: null,
  ...over,
});

const FULL = 'كِتَابٌ';
const BARE = 'كتاب';

describe('slugs', () => {
  it('accepts the backend format only', () => {
    expect(isSlug('book')).toBe(true);
    expect(isSlug('crescent-moon')).toBe(true);
    expect(isSlug('Book')).toBe(false);
    expect(isSlug('a--b')).toBe(false);
    expect(isSlug('')).toBe(false);
  });
  it('proposes a slug from English text', () => {
    expect(slugFromText('Book (n.)')).toBe('book-n');
    expect(slugFromText('  ')).toBeNull();
    expect(slugFromText(null)).toBeNull();
  });
});

describe('vowelStatus and skeleton', () => {
  it('classifies full, partial and bare spellings', () => {
    expect(vowelStatus(BARE)).toBe('unvowelised');
    expect(vowelStatus(FULL)).toBe('full');
    expect(vowelStatus('كِتاب')).toBe('partial');
  });
  it('keeps the letters and drops the marks', () => {
    expect(skeleton(FULL)).toBe(BARE);
  });
});

describe('reads_as', () => {
  const target = word('w_full', FULL);
  it('flags an unvowelled spelling with no reading', () => {
    expect(awaitsReadsAs(word('w_bare', BARE))).toBe(true);
    expect(awaitsReadsAs(word('w_bare', BARE, { reads_as_id: 'w_full' }))).toBe(false);
    expect(awaitsReadsAs(target)).toBe(false);
    expect(awaitsReadsAs(word('p', BARE, { is_pseudo: true }))).toBe(false);
  });
  it('offers only vowelled live same-letter spellings, same family first', () => {
    const source = word('w_bare', BARE, { family_id: 'book' });
    const other = word('w_other', 'كُتُبٌ');
    const sameFamily = word('w_fam', 'كِتَابٌ', { family_id: 'book' });
    const otherFamily = word('w_x', 'كِتَابٌ', { family_id: 'page' });
    const chained = word('w_c', 'كِتَابٌ', { reads_as_id: 'w_full' });
    const retired = word('w_r', 'كِتَابٌ', { retired_at: '2026-01-01' });
    const partial = word('w_p', 'كِتاب');
    const got = readsAsCandidates(source, [other, otherFamily, chained, retired, partial, target, sameFamily, source]);
    expect(got.map((w) => w.id)).toEqual(['w_fam', 'w_full']);
  });
  it('offers nothing for a fully vowelled source', () => {
    expect(readsAsCandidates(target, [word('w2', FULL)])).toEqual([]);
  });
});

describe('review and family membership', () => {
  it('shows "not reviewed" on live real spellings only', () => {
    expect(isNotReviewed(word('a', FULL))).toBe(true);
    expect(isNotReviewed(word('a', FULL, { reviewed_at: '2026-01-01' }))).toBe(false);
    expect(isNotReviewed(word('a', FULL, { retired_at: '2026-01-01' }))).toBe(false);
    expect(isNotReviewed(word('a', FULL, { is_pseudo: true }))).toBe(false);
  });
  it('lists spellings that may join', () => {
    const list = [word('a', FULL), word('b', FULL, { family_id: 'book' }), word('c', FULL, { is_pseudo: true })];
    expect(joinableWords(list, 'book').map((w) => w.id)).toEqual(['a']);
  });
});

describe('familyErrorText', () => {
  it('explains known codes and falls back to the server message', () => {
    expect(familyErrorText('READS_AS_CHAIN', 'x')).toMatch(/final one/);
    expect(familyErrorText('UNKNOWN', 'server said')).toBe('server said');
    expect(familyErrorText(undefined, 'server said')).toBe('server said');
  });
});
