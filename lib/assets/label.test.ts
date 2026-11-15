import { describe, it, expect } from 'vitest';
import {
  EMPTY_LABEL,
  describeLabel,
  isIdentifyingLabel,
  labelProblems,
  matchesStatusFilter,
  normaliseLabel,
  statusAfterLabel,
} from './label';

describe('normaliseLabel', () => {
  it('trims fields and turns blanks into null', () => {
    expect(normaliseLabel({ ownerType: ' letter ', ownerId: '', role: 'letter_sound', text: '  ' }))
      .toEqual({ ownerType: 'letter', ownerId: null, role: 'letter_sound', locale: null, text: null });
  });
});

describe('isIdentifyingLabel', () => {
  it('needs a role and an owner or a text', () => {
    expect(isIdentifyingLabel(EMPTY_LABEL)).toBe(false);
    expect(isIdentifyingLabel({ ...EMPTY_LABEL, role: 'effect' })).toBe(false);
    expect(isIdentifyingLabel({ ...EMPTY_LABEL, text: 'بَ' })).toBe(false);
    expect(isIdentifyingLabel({ ...EMPTY_LABEL, role: 'letter_sound', text: 'بَ' })).toBe(true);
    expect(
      isIdentifyingLabel({ ...EMPTY_LABEL, role: 'illustration', ownerType: 'concept', ownerId: 'book' }),
    ).toBe(true);
  });
});

describe('statusAfterLabel', () => {
  const identifying = { ...EMPTY_LABEL, role: 'letter_sound', text: 'بَ' };
  it('activates a quarantined file whose label identifies it', () => {
    expect(statusAfterLabel('quarantined', identifying)).toBe('active');
  });
  it('quarantines an active file whose label no longer identifies it', () => {
    expect(statusAfterLabel('active', EMPTY_LABEL)).toBe('quarantined');
  });
  it('keeps orphan, superseded and broken', () => {
    expect(statusAfterLabel('orphan', identifying)).toBe('orphan');
    expect(statusAfterLabel('superseded', EMPTY_LABEL)).toBe('superseded');
    expect(statusAfterLabel('broken', identifying)).toBe('broken');
  });
});

describe('labelProblems', () => {
  it('accepts an empty label and a well-formed one', () => {
    expect(labelProblems(EMPTY_LABEL)).toEqual([]);
    expect(
      labelProblems({ ownerType: 'letter', ownerId: 'baa', role: 'letter_sound', locale: 'ar', text: 'بَ' }),
    ).toEqual([]);
  });
  it('flags half an owner, bad slugs and bad locales', () => {
    expect(labelProblems({ ...EMPTY_LABEL, ownerType: 'letter' })).toHaveLength(1);
    expect(labelProblems({ ...EMPTY_LABEL, role: 'Letter Sound' })).toHaveLength(1);
    expect(labelProblems({ ...EMPTY_LABEL, locale: 'Arabic' })).toHaveLength(1);
  });
});

describe('matchesStatusFilter', () => {
  it('passes everything in use without a filter; retired and superseded only when asked for', () => {
    expect(matchesStatusFilter(null, undefined)).toBe(true);
    expect(matchesStatusFilter('orphan', undefined)).toBe(true);
    expect(matchesStatusFilter('retired', undefined)).toBe(false);
    expect(matchesStatusFilter('superseded', undefined)).toBe(false);
    expect(matchesStatusFilter('retired', 'retired')).toBe(true);
    expect(matchesStatusFilter('superseded', 'superseded')).toBe(true);
  });
  it('matches a status and the unregistered bucket', () => {
    expect(matchesStatusFilter('quarantined', 'quarantined')).toBe(true);
    expect(matchesStatusFilter('active', 'quarantined')).toBe(false);
    expect(matchesStatusFilter(null, 'unregistered')).toBe(true);
    expect(matchesStatusFilter('active', 'unregistered')).toBe(false);
    expect(matchesStatusFilter(null, 'orphan')).toBe(false);
  });
});

describe('describeLabel', () => {
  it('joins the set fields', () => {
    expect(describeLabel(null)).toBeNull();
    expect(describeLabel(EMPTY_LABEL)).toBeNull();
    expect(describeLabel({ ownerType: 'letter', ownerId: 'baa', role: 'letter_sound', locale: 'ar', text: null }))
      .toBe('letter_sound · letter:baa · ar');
  });
});
