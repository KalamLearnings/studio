import { describe, expect, it } from 'vitest';
import { approvalBody, isPhraseReviewer, phraseReviewErrorText, reasonText } from './phraseReview';

describe('phrase review helpers', () => {
  it('lets a phrase reviewer or a lead approve, nobody else', () => {
    expect(isPhraseReviewer({ app_metadata: { phrase_reviewer: true } })).toBe(true);
    expect(isPhraseReviewer({ app_metadata: { curriculum_lead: true } })).toBe(true);
    expect(isPhraseReviewer({ app_metadata: { role: 'staff' } })).toBe(false);
    expect(isPhraseReviewer({ app_metadata: { phrase_reviewer: 'true' } })).toBe(false);
    expect(isPhraseReviewer(null)).toBe(false);
  });

  it('explains why a phrase is pending', () => {
    expect(reasonText('unreviewed')).toMatch(/No reviewer/);
    expect(reasonText('flag_mismatch')).toMatch(/other kind/);
    expect(reasonText(null)).toBe('');
  });

  it('sends only the ids and the flag', () => {
    expect(approvalBody({ word_ids: ['a', 'b'], is_sentence: true })).toEqual({ word_ids: ['a', 'b'], is_sentence: true });
  });

  it('reads the backend refusals', () => {
    expect(phraseReviewErrorText({ code: 'PHRASE_REVIEWER_REQUIRED' })).toMatch(/phrase reviewer/);
    expect(
      phraseReviewErrorText({ code: 'PHRASE_WORDS_INVALID', details: [{ message: 'w1 is retired' }, { message: 'w2 is missing' }] }),
    ).toBe('The phrase cannot be approved: w1 is retired; w2 is missing');
    expect(phraseReviewErrorText(new Error('boom'))).toBe('boom');
  });
});
