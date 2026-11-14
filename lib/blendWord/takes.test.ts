import { describe, it, expect } from 'vitest';
import {
  anyPending,
  audioErrorView,
  draftFromTake,
  EMPTY_SETTINGS_DRAFT,
  formStatusChips,
  generateBody,
  latestTake,
  proposeRegenerate,
  settingsFromDraft,
  takeActions,
  takeErrorText,
  takeRejectBody,
  type BlendReviewTake,
} from './takes';

function take(over: Partial<BlendReviewTake> = {}): BlendReviewTake {
  return {
    id: 't1',
    kind: 'natural',
    source: 'generated',
    status: 'needs_review',
    current: true,
    url: 'https://x/a.mp3',
    durationMs: 600,
    marks: [0, 200, 600],
    phases: [{ unit: 0, kind: 'short', startMs: 0, endMs: 200 }, { unit: 1, kind: 'madd', startMs: 200, endMs: 600 }],
    qaFlags: [],
    error: null,
    attempts: 1,
    voiceId: 'v1',
    settings: {
      kind: 'natural',
      text: 'كِتَابْ',
      voiceId: 'v1',
      seed: 41,
      voiceSettings: { stability: 0.5, similarity_boost: 0.75, style: 0.2 },
      outputFormat: 'mp3_24000',
      refineWindowMs: 40,
      speech: { startMs: 0, endMs: 600 },
    },
    request: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-11-13T00:00:00Z',
    ...over,
  };
}

describe('status chips', () => {
  it('shows natural and stretched from the newest current take of each kind', () => {
    const takes = [
      take({ id: 'n2', status: 'failed', error: 'spend_disabled' }),
      take({ id: 'n1', status: 'ready' }),
      take({ id: 's-old', kind: 'stretched', status: 'ready', current: false }),
    ];
    const chips = formStatusChips(takes);
    expect(chips[0]).toMatchObject({ kind: 'natural', status: 'failed', label: 'Failed', tone: 'danger', detail: 'Audio generation was turned off.' });
    expect(chips[1]).toMatchObject({ kind: 'stretched', status: null, label: 'No take' });
    expect(latestTake(takes, 'natural')?.id).toBe('n2');
  });

  it('labels every status in plain words', () => {
    const labels = (['pending', 'needs_review', 'ready', 'failed', 'not_voiceable'] as const).map(
      (status) => formStatusChips([take({ status })])[0].label,
    );
    expect(labels).toEqual(['Pending', 'Needs review', 'Ready', 'Failed', 'Not voiceable']);
  });

  it('knows when something is being made', () => {
    expect(anyPending([take({ status: 'pending' })])).toBe(true);
    expect(anyPending([take()])).toBe(false);
  });
});

describe('takeErrorText', () => {
  it('reads a stored rejection', () => {
    expect(takeErrorText('rejected (short_vowel_too_long): the kasra drags')).toBe(
      'Rejected: Short vowel too long. the kasra drags',
    );
    expect(takeErrorText('rejected (noise)')).toBe('Rejected: Noise.');
  });
  it('reads known failures and passes others through', () => {
    expect(takeErrorText('alignment_text_mismatch: got كتاب')).toBe('The voice said a different word.');
    expect(takeErrorText('its natural take was rejected')).toBe('Its natural take was rejected');
    expect(takeErrorText(null)).toBeNull();
  });
});

describe('takeActions', () => {
  it('allows approve and marks only on a complete current take waiting for review', () => {
    expect(takeActions(take())).toEqual({ approve: true, reject: true, editMarks: true });
    expect(takeActions(take({ url: null }))).toMatchObject({ approve: false, editMarks: false });
    expect(takeActions(take({ status: 'ready' }))).toEqual({ approve: false, reject: true, editMarks: false });
    expect(takeActions(take({ status: 'pending' }))).toEqual({ approve: false, reject: false, editMarks: false });
    expect(takeActions(take({ current: false }))).toEqual({ approve: false, reject: false, editMarks: false });
  });
});

describe('regenerate settings', () => {
  it('starts from the settings the take was made with', () => {
    expect(draftFromTake(take())).toEqual({
      voiceId: 'v1',
      seed: '41',
      stability: '0.5',
      similarityBoost: '0.75',
      style: '0.2',
      arabicLanguageCode: false,
    });
    expect(draftFromTake(take({ kind: 'stretched', settings: { kind: 'stretched', fromTakeId: 'x', targetsMs: [] } }))).toEqual(
      EMPTY_SETTINGS_DRAFT,
    );
  });

  it('proposes a new seed, steadier delivery for length problems, and Arabic for a wrong word', () => {
    const long = proposeRegenerate(take(), 'short_vowel_too_long');
    expect(long).toMatchObject({ seed: '42', stability: '0.65', style: '0', arabicLanguageCode: false });
    const wrong = proposeRegenerate(take(), 'wrong_word');
    expect(wrong).toMatchObject({ seed: '42', stability: '0.5', arabicLanguageCode: true });
    expect(proposeRegenerate(null, 'noise').seed).toBe('1');
  });

  it('turns the draft into the backend request, leaving blanks out', () => {
    expect(settingsFromDraft(EMPTY_SETTINGS_DRAFT)).toEqual({ ok: true, request: {} });
    expect(
      settingsFromDraft({ voiceId: ' v2 ', seed: '7', stability: '0.8', similarityBoost: '', style: '0', arabicLanguageCode: true }),
    ).toEqual({
      ok: true,
      request: { voiceId: 'v2', seed: 7, voiceSettings: { stability: 0.8, style: 0 }, textHints: { languageCode: 'ar' } },
    });
  });

  it('refuses out-of-range values in plain words', () => {
    const r = settingsFromDraft({ ...EMPTY_SETTINGS_DRAFT, seed: '1.5', stability: '2' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.seed).toMatch(/whole number/);
      expect(r.errors.stability).toBe('Stability must be a number from 0 to 1.');
    }
  });
});

describe('request bodies', () => {
  it('rejects with a reason, a note for Other, and an optional regenerate', () => {
    expect(takeRejectBody('', '', null)).toEqual({ ok: false, error: 'Pick a reason.' });
    expect(takeRejectBody('other', ' ', null).ok).toBe(false);
    expect(takeRejectBody('noise', '', { seed: 3 })).toEqual({
      ok: true,
      body: { decision: 'reject', reason: 'noise', regenerate: { seed: 3 } },
    });
    expect(takeRejectBody('other', 'hiss', null)).toEqual({ ok: true, body: { decision: 'reject', reason: 'other', note: 'hiss' } });
  });

  it('sends Generate settings only when some are set', () => {
    expect(generateBody('pausal', false, {})).toEqual({ form: 'pausal', regenerate: false });
    expect(generateBody('full', true, { seed: 2 })).toEqual({ form: 'full', regenerate: true, settings: { seed: 2 } });
  });
});

describe('audioErrorView', () => {
  it('shows the switch-off as "Audio generation is turned off" and disables generation', () => {
    expect(audioErrorView({ status: 503, code: 'SPEND_DISABLED' })).toEqual({
      message: 'Audio generation is turned off.',
      disableGeneration: true,
    });
    expect(audioErrorView({ status: 503 })).toMatchObject({ disableGeneration: true });
  });
  it('explains the take refusals', () => {
    expect(audioErrorView({ status: 409, code: 'TAKE_STALE' }).message).toMatch(/older split/);
    expect(audioErrorView({ status: 404, code: 'BLEND_NOT_FOUND' }).message).toMatch(/Save the activity/);
    expect(audioErrorView({ status: 403 }).message).toBe('Only staff can review or generate audio.');
    expect(audioErrorView(new Error('boom')).message).toBe('Something went wrong. Try again.');
  });
});
