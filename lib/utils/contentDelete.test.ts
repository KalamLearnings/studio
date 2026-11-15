import { describe, expect, it } from 'vitest';
import { CONTENT_HAS_PROGRESS, deleteConfirmMessage, deleteErrorMessage } from './contentDelete';

describe('contentDelete', () => {
  it('the confirm text mentions unpublishing', () => {
    expect(deleteConfirmMessage('activity')).toMatch(/Unpublish it instead/);
  });
  it('a refused delete tells the author to unpublish', () => {
    expect(deleteErrorMessage({ code: CONTENT_HAS_PROGRESS, message: 'x' }, 'node')).toMatch(/Unpublish it instead/);
  });
  it('other errors keep their message', () => {
    expect(deleteErrorMessage({ message: 'boom' }, 'node')).toBe('boom');
    expect(deleteErrorMessage({}, 'node')).toBe('Failed to delete node');
  });
});
