import { describe, expect, it } from 'vitest';
import { isStoryNode, nodeTypeUpdate, storyBookChoices, storyNodeErrorText } from './storyNode';

describe('story node updates', () => {
  it('a story names its book; any other type sends no book_id (the backend clears it)', () => {
    expect(nodeTypeUpdate('story', 'b1')).toEqual({ type: 'story', book_id: 'b1' });
    expect(nodeTypeUpdate('lesson', 'b1')).toEqual({ type: 'lesson' });
    expect(nodeTypeUpdate('story', null)).toEqual({ type: 'story' });
  });

  it('knows a story node by its type', () => {
    expect(isStoryNode({ type: 'story' })).toBe(true);
    expect(isStoryNode({ type: 'lesson' })).toBe(false);
    expect(isStoryNode(undefined)).toBe(false);
  });
});

describe('story book choices', () => {
  const books = [
    { id: 'c', title: 'Cat' },
    { id: 'a', title: 'Ant' },
    { id: 'b', title: 'Bee' },
    { id: 'd', title: 'Dog' },
  ];
  const source: Record<string, boolean | undefined> = { a: true, b: false, c: true, d: undefined };

  it('lists books with a saved reader source only, by title', () => {
    expect(storyBookChoices(books, (id) => source[id]).map((b) => b.id)).toEqual(['a', 'c']);
  });

  it('keeps the current book even when its source is gone', () => {
    expect(storyBookChoices(books, (id) => source[id], 'b').map((b) => b.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('story node errors', () => {
  const err = (code: string) => Object.assign(new Error('x'), { code });

  it('says the backend story refusals in plain language', () => {
    expect(storyNodeErrorText(err('STORY_NODE_BOOK_INVALID'))).toMatch(/no saved reader source/);
    expect(storyNodeErrorText(err('STORY_NODE_HAS_NO_ACTIVITIES'))).toMatch(/has activities/);
    expect(storyNodeErrorText(err('STORY_NODE_BOOK_REQUIRED'))).toMatch(/needs a book/);
    expect(storyNodeErrorText(err('STORY_NODE_BOOK_NOT_ALLOWED'))).toMatch(/Only a story node/);
  });

  it('leaves other errors to the caller', () => {
    expect(storyNodeErrorText(err('NOT_FOUND'))).toBeNull();
    expect(storyNodeErrorText(new Error('x'))).toBeNull();
    expect(storyNodeErrorText(null)).toBeNull();
  });
});
