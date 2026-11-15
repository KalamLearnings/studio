/**
 * Delete wording for curriculum content. The backend refuses to delete content
 * that children have progress in (CONTENT_HAS_PROGRESS, CM-B29); authors
 * unpublish it instead.
 */

export const CONTENT_HAS_PROGRESS = 'CONTENT_HAS_PROGRESS';

const UNPUBLISH_HINT = 'If children have progress in it, it cannot be deleted. Unpublish it instead.';

export function deleteConfirmMessage(kind: string, extra = ''): string {
  return `Delete this ${kind}?${extra} ${UNPUBLISH_HINT}`;
}

/** The toast text for a failed delete; explains the unpublish path when the backend refuses. */
export function deleteErrorMessage(error: { message?: string; code?: string }, kind: string): string {
  if (error.code === CONTENT_HAS_PROGRESS) {
    return `Children have progress in this ${kind}, so it cannot be deleted. Unpublish it instead.`;
  }
  return error.message || `Failed to delete ${kind}`;
}
