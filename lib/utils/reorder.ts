/**
 * Pure utility functions for drag-and-drop reordering
 * All functions are side-effect free and testable
 */

export interface ReorderableItem {
  id: string;
  sequence_number: number;
}

/**
 * Reorder items based on drag event
 * @param items - Array of items with sequence_number
 * @param activeId - ID of the dragged item
 * @param overId - ID of the drop target
 * @returns New array with updated sequence numbers
 */
export function reorderItems<T extends ReorderableItem>(
  items: T[],
  activeId: string,
  overId: string
): T[] {
  if (activeId === overId) return items;

  const oldIndex = items.findIndex((item) => item.id === activeId);
  const newIndex = items.findIndex((item) => item.id === overId);

  if (oldIndex === -1 || newIndex === -1) return items;

  // Create a new array with the item moved
  const reordered = [...items];
  const [movedItem] = reordered.splice(oldIndex, 1);
  reordered.splice(newIndex, 0, movedItem);

  // Update sequence numbers to match new positions
  return reordered.map((item, index) => ({
    ...item,
    sequence_number: index + 1,
  }));
}

/**
 * Get only items that have changed sequence numbers
 * Used to send minimal data to the API
 */
export function getChangedItems<T extends ReorderableItem>(
  original: T[],
  updated: T[]
): Array<{ id: string; sequence_number: number }> {
  const changes: Array<{ id: string; sequence_number: number }> = [];

  updated.forEach((item) => {
    const originalItem = original.find((o) => o.id === item.id);
    if (originalItem && originalItem.sequence_number !== item.sequence_number) {
      changes.push({
        id: item.id,
        sequence_number: item.sequence_number,
      });
    }
  });

  return changes;
}

/**
 * Check if items have been reordered
 */
export function hasChanges<T extends ReorderableItem>(
  original: T[],
  updated: T[]
): boolean {
  if (original.length !== updated.length) return true;

  return original.some((item, index) => {
    const updatedItem = updated[index];
    return (
      item.id !== updatedItem.id ||
      item.sequence_number !== updatedItem.sequence_number
    );
  });
}

/**
 * Move item by keyboard (up/down)
 */
export function moveItemByKeyboard<T extends ReorderableItem>(
  items: T[],
  itemId: string,
  direction: 'up' | 'down'
): T[] {
  const currentIndex = items.findIndex((item) => item.id === itemId);
  if (currentIndex === -1) return items;

  const newIndex =
    direction === 'up'
      ? Math.max(0, currentIndex - 1)
      : Math.min(items.length - 1, currentIndex + 1);

  if (currentIndex === newIndex) return items;

  const reordered = [...items];
  const [movedItem] = reordered.splice(currentIndex, 1);
  reordered.splice(newIndex, 0, movedItem);

  return reordered.map((item, index) => ({
    ...item,
    sequence_number: index + 1,
  }));
}

/**
 * Sort items by sequence_number (for display)
 */
export function sortBySequence<T extends ReorderableItem>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sequence_number - b.sequence_number);
}
