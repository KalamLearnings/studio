/**
 * React Query hooks for activity template operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listActivityTemplates,
  getActivityTemplate,
  createActivityTemplate,
  updateActivityTemplate,
  deleteActivityTemplate,
  instantiateTemplate,
} from '@/lib/api/curricula';
import type {
  ActivityTemplate,
  CreateActivityTemplate,
  UpdateActivityTemplate,
  InstantiateTemplate,
} from '@/lib/schemas/curriculum';
import { toast } from 'sonner';

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch all activity templates with optional filters
 */
export function useActivityTemplates(params?: {
  type?: string;
  category?: string;
}) {
  return useQuery({
    queryKey: ['activity-templates', params],
    queryFn: () => listActivityTemplates(params),
    staleTime: 5 * 60 * 1000, // 5 minutes - templates change less often
  });
}

/**
 * Fetch a single activity template
 */
export function useActivityTemplate(id: string | null) {
  return useQuery({
    queryKey: ['activity-template', id],
    queryFn: () => getActivityTemplate(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new activity template
 */
export function useCreateActivityTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateActivityTemplate) => createActivityTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-templates'] });
      toast.success('Template created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create template');
    },
  });
}

/**
 * Update an existing activity template
 */
export function useUpdateActivityTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateActivityTemplate }) =>
      updateActivityTemplate(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['activity-templates'] });
      queryClient.invalidateQueries({ queryKey: ['activity-template', id] });
      toast.success('Template updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update template');
    },
  });
}

/**
 * Delete an activity template
 */
export function useDeleteActivityTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteActivityTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-templates'] });
      toast.success('Template deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete template');
    },
  });
}

/**
 * Instantiate a template with variables to create an activity
 */
export function useInstantiateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InstantiateTemplate) => instantiateTemplate(data),
    onSuccess: (activity) => {
      // Invalidate activities for the node where the activity was created
      if (activity.node_id) {
        queryClient.invalidateQueries({
          queryKey: ['activities', activity.node_id],
        });
      }
      toast.success('Activity created from template');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create activity from template');
    },
  });
}
