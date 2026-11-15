/**
 * Story nodes in Studio (content model CM-S11; backend CM-B36): a node of
 * type `story` opens one storybook in the reader and holds no activities.
 * Pure: no React, no fetch.
 *
 * The backend decides (`domain/curriculum/story-node.ts`): a story node names
 * a book with a saved reader source (`STORY_NODE_BOOK_INVALID` otherwise),
 * no other type names one, a node with activities cannot become a story, and
 * leaving `story` clears the book.
 */

export const STORY_NODE_TYPE = 'story' as const;

export function isStoryNode(node: { type?: string | null } | null | undefined): boolean {
  return node?.type === STORY_NODE_TYPE;
}

/** The node update a type change sends: a story names its book; any other type sends no `book_id`. */
export function nodeTypeUpdate<T extends string>(
  type: T,
  bookId: string | null,
): { type: T; book_id?: string } {
  return type === STORY_NODE_TYPE && bookId ? { type, book_id: bookId } : { type };
}

/** A book as the picker lists it. */
export interface StoryBookChoice {
  id: string;
  title: string;
  title_ar?: string | null;
}

/**
 * The books a story node may open: those whose reader source is saved
 * (`GET /books/admin/:id/reader/source` answers a `source`). A book whose
 * source is still loading or failed to load is left out; the current book is
 * kept so the picker can show it even when its source is gone.
 */
export function storyBookChoices<B extends StoryBookChoice>(
  books: readonly B[],
  hasSource: (bookId: string) => boolean | undefined,
  currentBookId?: string | null,
): B[] {
  return books
    .filter((b) => hasSource(b.id) === true || b.id === currentBookId)
    .sort((a, b) => a.title.localeCompare(b.title));
}

const STORY_ERRORS: Record<string, string> = {
  STORY_NODE_BOOK_REQUIRED: 'A story node needs a book. Pick one.',
  STORY_NODE_BOOK_INVALID:
    'That book has no saved reader source. Save its reader source on the book page first, or pick another book.',
  STORY_NODE_BOOK_NOT_ALLOWED: 'Only a story node opens a book.',
  STORY_NODE_HAS_NO_ACTIVITIES:
    'This node has activities. A story node holds none: move or delete its activities first.',
};

/**
 * The backend's story-node refusal in plain language, or null for any other
 * error. Reads the `code` an `ApiError` (`lib/api/client`) carries.
 */
export function storyNodeErrorText(error: unknown): string | null {
  const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : undefined;
  return typeof code === 'string' ? STORY_ERRORS[code] ?? null : null;
}
