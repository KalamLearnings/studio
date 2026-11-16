import { describe, expect, it } from 'vitest';
import {
  audioSummary,
  currentTake,
  generateBody,
  GENERATION_OFF_TEXT,
  isGenerationOff,
  phraseAudioActions,
  phraseAudioErrorText,
  phraseRejectBody,
  takeToReject,
  type PhraseAudioStatus,
  type PhraseAudioTake,
} from './phraseAudio';

const take = (over: Partial<PhraseAudioTake>): PhraseAudioTake => ({
  id: 't', status: 'needs_review', text: 'x', current: true, served: false, url: 'u', asset_id: null,
  duration_ms: 1000, voice_id: null, settings: null, error: null, requested_by: null, reviewed_by: null,
  reviewed_at: null, created_at: '2026-01-01', ...over,
});
const status = (over: Partial<PhraseAudioStatus> = {}): PhraseAudioStatus => ({
  phrase_key: 'a b', word_ids: ['a', 'b'], text: 'x', phrase_approved: true, is_sentence: false,
  generation_enabled: true, served_take_id: null, takes: [], ...over,
});

describe('phrase audio helpers', () => {
  it('picks the served take, else the newest current one', () => {
    const s = status({ served_take_id: 'old', takes: [take({ id: 'new' }), take({ id: 'old', status: 'approved', served: true })] });
    expect(currentTake(s)?.id).toBe('old');
    expect(currentTake(status({ takes: [take({ id: 'h', current: false }), take({ id: 'n' })] }))?.id).toBe('n');
    expect(currentTake(status())).toBeNull();
  });

  it('summarises in plain words', () => {
    expect(audioSummary(status())).toBe('No audio yet.');
    expect(audioSummary(status({ phrase_approved: false }))).toMatch(/Approve the phrase/);
    expect(audioSummary(status({ takes: [take({})] }))).toMatch(/waits for review/);
    expect(audioSummary(status({ takes: [take({ status: 'pending' })] }))).toMatch(/being made/);
    expect(audioSummary(status({ takes: [take({ status: 'approved', served: true })] }))).toMatch(/in use/);
    expect(audioSummary(status({ takes: [take({ status: 'failed' })] }))).toMatch(/failed/);
  });

  it('shows actions only to reviewers, only when they make sense', () => {
    const waiting = status({ takes: [take({})] });
    expect(phraseAudioActions(waiting, false)).toEqual({ generate: false, approve: false, reject: false });
    expect(phraseAudioActions(waiting, true)).toEqual({ generate: true, approve: true, reject: true });
    expect(phraseAudioActions(status({ generation_enabled: false }), true).generate).toBe(false);
    expect(phraseAudioActions(status({ takes: [take({ status: 'pending' })] }), true).generate).toBe(false);
    expect(phraseAudioActions(status({ phrase_approved: false }), true).generate).toBe(false);
    const served = status({ takes: [take({ status: 'approved', served: true })] });
    expect(phraseAudioActions(served, true)).toEqual({ generate: true, approve: false, reject: true });
    expect(takeToReject(served)?.served).toBe(true);
  });

  it('builds a reject body', () => {
    expect(phraseRejectBody('', '')).toEqual({ ok: false, error: 'Pick a reason.' });
    expect(phraseRejectBody('other', '  ').ok).toBe(false);
    expect(phraseRejectBody('noise', '')).toEqual({ ok: true, body: { reason: 'noise' } });
    expect(phraseRejectBody('other', ' hiss ')).toEqual({ ok: true, body: { reason: 'other', note: 'hiss' } });
    expect(phraseRejectBody('noise', 'x'.repeat(501)).ok).toBe(false);
  });

  it('sends settings only when set', () => {
    expect(generateBody(null)).toEqual({});
    expect(generateBody({})).toEqual({});
    expect(generateBody({ seed: 3 })).toEqual({ settings: { seed: 3 } });
  });

  it('treats the switches as calm, not as errors', () => {
    expect(isGenerationOff({ code: 'SPEND_DISABLED' })).toBe(true);
    expect(isGenerationOff({ code: 'PHRASE_AUDIO_GENERATION_DISABLED' })).toBe(true);
    expect(isGenerationOff({ code: 'PHRASE_NOT_APPROVED' })).toBe(false);
    expect(phraseAudioErrorText({ code: 'SPEND_DISABLED' })).toBe(GENERATION_OFF_TEXT);
    expect(phraseAudioErrorText({ code: 'PHRASE_AUDIO_IN_PROGRESS' })).toMatch(/already/);
    expect(phraseAudioErrorText({ status: 404 })).toMatch(/not found/);
    expect(phraseAudioErrorText(new Error('boom'))).toBe('boom');
  });
});
