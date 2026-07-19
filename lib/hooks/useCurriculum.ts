/**
 * React Query hooks for curriculum operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listCurricula,
  getCurriculum,
  createCurriculum,
  updateCurriculum,
  deleteCurriculum,
  reorderCurricula,
} from '@/lib/api/curricula';
import type { Curriculum, CreateCurriculum, UpdateCurriculum } from '@/lib/schemas/curriculum';
import { toast } from 'sonner'; // or your toast library

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch all curricula
 */
export function useCurricula() {
  return useQuery({
    queryKey: ['curricula'],
    queryFn: listCurricula,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single curriculum
 */
export function useCurriculum(id: string | null) {
  return useQuery({
    queryKey: ['curriculum', id],
    queryFn: () => getCurriculum(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new curriculum
 */
export function useCreateCurriculum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCurriculum) => createCurriculum(data),
    onSuccess: (newCurriculum) => {
      // Invalidate list to refetch
      queryClient.invalidateQueries({ queryKey: ['curricula'] });
      toast.success('Curriculum created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create curriculum');
    },
  });
}

/**
 * Update an existing curriculum
 */
export function useUpdateCurriculum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCurriculum }) =>
      updateCurriculum(id, data),
    onSuccess: (updatedCurriculum) => {
      // Update cache
      queryClient.setQueryData<Curriculum>(
        ['curriculum', updatedCurriculum.id],
        updatedCurriculum
      );
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: ['curricula'] });
      toast.success('Curriculum updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update curriculum');
    },
  });
}

/**
 * Reorder curricula (for drag-and-drop)
 *
 * Optimistically reorders the cached list so the grid settles immediately
 * instead of snapping back while the request is in flight.
 */
export function useReorderCurricula() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { reordered: Curriculum[] },
    { previous?: Curriculum[] }
  >({
    // Takes the ALREADY-reordered list. Deriving it here from the cache would
    // be wrong: onMutate runs first and writes the moved list to the cache, so
    // applying the move again would -- for a single-position swap -- land the
    // item back where it started and send an unchanged payload.
    mutationFn: async ({ reordered }) => {
      // Send the COMPLETE ordered list. Unlike topics, the backend does not
      // renumber -- it writes these numbers verbatim -- so a partial delta
      // would leave untouched rows holding stale numbers and scramble the
      // order.
      const items = reordered.map((curriculum, index) => ({
        id: curriculum.id,
        sequence_number: index + 1,
      }));

      await reorderCurricula({ items });
    },
    onMutate: async ({ reordered }) => {
      await queryClient.cancelQueries({ queryKey: ['curricula'] });
      const previous = queryClient.getQueryData<Curriculum[]>(['curricula']);

      queryClient.setQueryData<Curriculum[]>(['curricula'], reordered);

      return { previous };
    },
    onError: (error, _vars, context) => {
      // Roll back to the pre-drag order.
      if (context?.previous) {
        queryClient.setQueryData<Curriculum[]>(['curricula'], context.previous);
      }
      toast.error(error.message || 'Failed to reorder curricula');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['curricula'] });
    },
  });
}

/**
 * Move the item with `activeId` to the position of `overId`.
 * Returns null when the move is a no-op.
 *
 * Mirrors `applyMoveToPosition` in the backend's curriculum/reorder-sequence.ts,
 * which carries the unit tests for this math. The two repos share no code path,
 * so keep them in step by hand.
 */
export function reorderById(
  curricula: Curriculum[],
  activeId: string,
  overId: string
): Curriculum[] | null {
  const oldIndex = curricula.findIndex((c) => c.id === activeId);
  const newIndex = curricula.findIndex((c) => c.id === overId);
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return null;
  }

  const reordered = [...curricula];
  const [moved] = reordered.splice(oldIndex, 1);
  reordered.splice(newIndex, 0, moved);
  return reordered;
}

/**
 * Delete a curriculum
 */
export function useDeleteCurriculum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCurriculum(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['curriculum', id] });
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: ['curricula'] });
      toast.success('Curriculum deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete curriculum');
    },
  });
}
