import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/curricula', () => ({}));
vi.mock('@/lib/api/client', () => ({}));
import { mapNodeType } from './useGenerateTopic';

describe('mapNodeType', () => {
  it('passes the backend node types through', () => {
    for (const t of ['intro', 'lesson', 'practice', 'review', 'boss']) expect(mapNodeType(t)).toBe(t);
  });
  it('never sends assessment', () => {
    expect(mapNodeType('assessment')).toBe('lesson');
  });
  it('falls back to lesson for unknown types', () => {
    expect(mapNodeType('whatever')).toBe('lesson');
  });
});
