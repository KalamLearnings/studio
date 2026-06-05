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
