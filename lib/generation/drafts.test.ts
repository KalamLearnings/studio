import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', () => ({
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number, public code?: string) {
      super(message);
    }
  },
}));

import { ApiError } from '@/lib/api/client';
import {
  describeGenerationError,
  describeRequestResult,
  draftStatus,
  failedChecks,
  isCurriculumLead,
  sortDrafts,
  type DraftProvenance,
  type DraftRow,
} from './drafts';

const prov = (over: Partial<DraftProvenance> = {}): DraftProvenance => ({
  origin: 'ai_draft', provider: 'p', model: 'm', template: { type: 'grid_tap', version: '1' },
  prompt_version: '1', exemplar_ids: [], required_form: null, requested_by: 'u',
  created_at: '2026-01-01T00:00:00Z', checks: [], ...over,
});
const row = (id: string, over: Partial<DraftRow> = {}): DraftRow => ({
  id, node_id: 'n', type: 'grid_tap', is_published: false, is_exemplar: false,
  provenance: prov(), approved_by: null, approved_at: null, config: null,
  created_at: '2026-01-01T00:00:00Z', ...over,
});

describe('isCurriculumLead', () => {
  it('needs app_metadata.curriculum_lead to be exactly true', () => {
    expect(isCurriculumLead({ app_metadata: { role: 'staff', curriculum_lead: true } })).toBe(true);
    expect(isCurriculumLead({ app_metadata: { role: 'staff' } })).toBe(false);
    expect(isCurriculumLead({ app_metadata: { curriculum_lead: 'true' } })).toBe(false);
    expect(isCurriculumLead(null)).toBe(false);
  });
});

describe('draftStatus and sortDrafts', () => {
  it('reads the status from provenance, approval and publication', () => {
    expect(draftStatus(row('a'))).toBe('pending');
    expect(draftStatus(row('a', { approved_by: 'l' }))).toBe('approved');
    expect(draftStatus(row('a', { approved_by: 'l', is_published: true }))).toBe('published');
    expect(draftStatus(row('a', { provenance: prov({ review: { decision: 'rejected', by: 'l', at: 'x', reason: null } }) }))).toBe('rejected');
  });
  it('puts pending first, newest first inside a status', () => {
    const rows = [
      row('old', { created_at: '2026-01-01T00:00:00Z' }),
      row('appr', { approved_by: 'l' }),
      row('new', { created_at: '2026-02-01T00:00:00Z' }),
    ];
    expect(sortDrafts(rows).map((r) => r.id)).toEqual(['new', 'old', 'appr']);
  });
});

describe('failedChecks', () => {
  it('lists only failing checks', () => {
    const p = prov({ checks: [{ check: 'a', status: 'pass' }, { check: 'b', status: 'fail' }] });
    expect(failedChecks(p).map((c) => c.check)).toEqual(['b']);
    expect(failedChecks(null)).toEqual([]);
  });
});

describe('messages', () => {
  it('words the switched-off 503 plainly', () => {
    expect(describeGenerationError(new ApiError('x', 503, 'GENERATION_DISABLED'))).toMatch(/switched off/);
    expect(describeGenerationError(new ApiError('x', 503))).toMatch(/switched off/);
  });
  it('shows the unapproved publish refusal clearly', () => {
    expect(describeGenerationError(new ApiError('x', 409, 'DRAFT_NOT_APPROVED'))).toMatch(/not approved it yet/);
  });
  it('falls back to the server message', () => {
    expect(describeGenerationError(new ApiError('boom', 500))).toBe('boom');
    expect(describeGenerationError(new Error('net'))).toBe('net');
  });
  it('describes a request result', () => {
    expect(describeRequestResult({ status: 'rejected', checks: [{ check: 'taught_only', status: 'fail' }] })).toMatch(/taught_only/);
    expect(describeRequestResult({ status: 'no_draft', reason: 'invalid', issues: [] })).toMatch(/invalid/);
  });
});
