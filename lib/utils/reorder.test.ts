import { describe, it, expect } from 'vitest';
import {
  reorderItems,
  getChangedItems,
  hasChanges,
  moveItemByKeyboard,
  sortBySequence,
} from './reorder';

describe('reorderItems', () => {
  const items = [
    { id: 'a', sequence_number: 1, name: 'First' },
    { id: 'b', sequence_number: 2, name: 'Second' },
    { id: 'c', sequence_number: 3, name: 'Third' },
    { id: 'd', sequence_number: 4, name: 'Fourth' },
  ];

  it('should move item down', () => {
    const result = reorderItems(items, 'a', 'c');
    expect(result.map((r) => r.id)).toEqual(['b', 'c', 'a', 'd']);
    expect(result.map((r) => r.sequence_number)).toEqual([1, 2, 3, 4]);
  });

  it('should move item up', () => {
    const result = reorderItems(items, 'd', 'b');
    expect(result.map((r) => r.id)).toEqual(['a', 'd', 'b', 'c']);
    expect(result.map((r) => r.sequence_number)).toEqual([1, 2, 3, 4]);
  });

  it('should return same array if activeId === overId', () => {
    const result = reorderItems(items, 'b', 'b');
    expect(result).toEqual(items);
  });

  it('should return same array if item not found', () => {
    const result = reorderItems(items, 'z', 'a');
    expect(result).toEqual(items);
  });

  it('should preserve other properties', () => {
    const result = reorderItems(items, 'a', 'c');
    expect(result[2].name).toBe('First');
  });
});

describe('getChangedItems', () => {
  it('should return only changed items', () => {
    const original = [
      { id: 'a', sequence_number: 1 },
      { id: 'b', sequence_number: 2 },
      { id: 'c', sequence_number: 3 },
    ];
    const updated = [
      { id: 'b', sequence_number: 1 },
      { id: 'a', sequence_number: 2 },
      { id: 'c', sequence_number: 3 },
    ];

    const changes = getChangedItems(original, updated);
    expect(changes).toEqual([
      { id: 'b', sequence_number: 1 },
      { id: 'a', sequence_number: 2 },
    ]);
  });

  it('should return empty array if no changes', () => {
    const items = [
      { id: 'a', sequence_number: 1 },
      { id: 'b', sequence_number: 2 },
    ];
    const changes = getChangedItems(items, items);
    expect(changes).toEqual([]);
  });
});

describe('hasChanges', () => {
  it('should detect reorder', () => {
    const original = [
      { id: 'a', sequence_number: 1 },
      { id: 'b', sequence_number: 2 },
    ];
    const updated = [
      { id: 'b', sequence_number: 1 },
      { id: 'a', sequence_number: 2 },
    ];
    expect(hasChanges(original, updated)).toBe(true);
  });

  it('should return false if no changes', () => {
    const items = [
      { id: 'a', sequence_number: 1 },
      { id: 'b', sequence_number: 2 },
    ];
    expect(hasChanges(items, items)).toBe(false);
  });

  it('should detect length difference', () => {
    const original = [{ id: 'a', sequence_number: 1 }];
    const updated = [
      { id: 'a', sequence_number: 1 },
      { id: 'b', sequence_number: 2 },
    ];
    expect(hasChanges(original, updated)).toBe(true);
  });
});

describe('moveItemByKeyboard', () => {
  const items = [
    { id: 'a', sequence_number: 1 },
    { id: 'b', sequence_number: 2 },
    { id: 'c', sequence_number: 3 },
  ];

  it('should move item up', () => {
    const result = moveItemByKeyboard(items, 'b', 'up');
    expect(result.map((r) => r.id)).toEqual(['b', 'a', 'c']);
  });

  it('should move item down', () => {
    const result = moveItemByKeyboard(items, 'b', 'down');
    expect(result.map((r) => r.id)).toEqual(['a', 'c', 'b']);
  });

  it('should not move first item up', () => {
    const result = moveItemByKeyboard(items, 'a', 'up');
    expect(result.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('should not move last item down', () => {
    const result = moveItemByKeyboard(items, 'c', 'down');
    expect(result.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('sortBySequence', () => {
  it('should sort by sequence_number', () => {
    const unsorted = [
      { id: 'c', sequence_number: 3 },
      { id: 'a', sequence_number: 1 },
      { id: 'b', sequence_number: 2 },
    ];
    const sorted = sortBySequence(unsorted);
    expect(sorted.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('should not mutate original', () => {
    const original = [
      { id: 'b', sequence_number: 2 },
      { id: 'a', sequence_number: 1 },
    ];
    sortBySequence(original);
    expect(original[0].id).toBe('b');
  });
});
