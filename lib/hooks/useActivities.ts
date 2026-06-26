/**
 * React Query hooks for activity operations including batch reorder
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  reorderArticles,
  listActivitiesByType,
} from '@/lib/api/curricula';
import type { Article, CreateArticle, UpdateArticle, BatchReorder } from '@/lib/schemas/curriculum';
import type { ActivityTypeGroup } from '@/lib/api/curricula';
import type { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { sortBySequence } from '@/lib/utils/reorder';

// ============================================================================
// CACHE HELPERS
// ============================================================================

/**
 * Insert-or-replace an activity in the query caches the builder reads from, so a
 * create/update response (carrying the backend-owned instruction.audio_url) is
 * reflected immediately — before the invalidation refetch resolves.
 *
 * Updates both the per-node `activities` cache and every `all-activities` cache
 * (its key embeds the sorted node ids, so we match by prefix).
 */
function upsertActivityInCaches(
  queryClient: QueryClient,
  curriculumId: string,
  nodeId: string,
  activity: Article,
) {
  const replace = (list: Article[] | undefined) => {
    if (!list) return list;
    const idx = list.findIndex((a) => a.id === activity.id);
    if (idx === -1) return [...list, activity];
    const next = [...list];
    next[idx] = activity;
    return next;
  };

  queryClient.setQueryData<Article[]>(['activities', curriculumId, nodeId], replace);
  queryClient.setQueriesData<Article[]>(
    { queryKey: ['all-activities', curriculumId] },
    replace,
  );
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch all activities for a node
 */
export function useActivities(curriculumId: string, nodeId: string | null) {
  return useQuery({
    queryKey: ['activities', curriculumId, nodeId],
    queryFn: () => listArticles(curriculumId, nodeId!),
    enabled: !!nodeId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data: Article[]) => [...data].sort((a, b) => a.sequence_number - b.sequence_number), // Always return sorted
  });
}

/**
 * Fetch all activities for all nodes in a curriculum
 * Used in builder tree view where multiple nodes are expanded
 */
export function useAllActivities(curriculumId: string, nodeIds: string[]) {
  return useQuery({
    queryKey: ['all-activities', curriculumId, nodeIds.sort()],
    queryFn: async () => {
      // Fetch activities for all nodes in parallel
      const activitiesArrays = await Promise.all(
        nodeIds.map((nodeId) => listArticles(curriculumId, nodeId))
      );
      // Flatten and return all activities
      return activitiesArrays.flat();
    },
    enabled: nodeIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data: Article[]) => [...data].sort((a, b) => a.sequence_number - b.sequence_number), // Always return sorted
  });
}

/**
 * Fetch all activities grouped by type
 * Used for "view by type" feature in builder
 */
export function useActivitiesByType(curriculumId: string | null) {
  return useQuery<ActivityTypeGroup[]>({
    queryKey: ['activities-by-type', curriculumId],
    queryFn: () => listActivitiesByType(curriculumId!),
    enabled: !!curriculumId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new activity
 */
export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      curriculumId,
      nodeId,
      data,
    }: {
      curriculumId: string;
      nodeId: string;
      data: CreateArticle;
    }) => createArticle(curriculumId, { ...data, node_id: nodeId }),
    onSuccess: (newActivity, { curriculumId, nodeId }) => {
      // Seed the caches with the returned activity (incl. backend-owned
      // instruction.audio_url) so the new clip is visible before the refetch.
      upsertActivityInCaches(queryClient, curriculumId, nodeId, newActivity);
      // Invalidate to refetch
      queryClient.invalidateQueries({ queryKey: ['activities', curriculumId, nodeId] });
      queryClient.invalidateQueries({ queryKey: ['all-activities', curriculumId] });
      toast.success('Activity created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create activity');
    },
  });
}

/**
 * Update an existing activity
 */
export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      curriculumId,
      nodeId,
      activityId,
      data,
    }: {
      curriculumId: string;
      nodeId: string;
      activityId: string;
      data: UpdateArticle;
    }) => updateArticle(curriculumId, activityId, data),
    onSuccess: (updatedActivity, { curriculumId, nodeId }) => {
      // Write the backend's response (incl. the server-owned
      // instruction.audio_url) into the caches so the player shows the new clip
      // without waiting for the refetch / a page refresh.
      upsertActivityInCaches(queryClient, curriculumId, nodeId, updatedActivity);
      queryClient.invalidateQueries({ queryKey: ['activities', curriculumId, nodeId] });
      queryClient.invalidateQueries({ queryKey: ['all-activities', curriculumId] });
      toast.success('Activity updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update activity');
    },
  });
}

/**
 * Delete an activity
 */
export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      curriculumId,
      nodeId,
      activityId,
    }: {
      curriculumId: string;
      nodeId: string;
      activityId: string;
    }) => deleteArticle(curriculumId, activityId),
    onSuccess: (_, { curriculumId, nodeId }) => {
      queryClient.invalidateQueries({ queryKey: ['activities', curriculumId, nodeId] });
      queryClient.invalidateQueries({ queryKey: ['all-activities', curriculumId] });
      toast.success('Activity deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete activity');
    },
  });
}

/**
 * Move activity to a different node
 */
export function useMoveActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      curriculumId,
      activityId,
      sourceNodeId,
      targetNodeId,
    }: {
      curriculumId: string;
      activityId: string;
      sourceNodeId: string;
      targetNodeId: string;
    }) => updateArticle(curriculumId, activityId, { node_id: targetNodeId } as any),
    onSuccess: (_, { curriculumId, sourceNodeId, targetNodeId }) => {
      queryClient.invalidateQueries({ queryKey: ['activities', curriculumId, sourceNodeId] });
      queryClient.invalidateQueries({ queryKey: ['activities', curriculumId, targetNodeId] });
      queryClient.invalidateQueries({ queryKey: ['all-activities', curriculumId] });
      toast.success('Activity moved successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to move activity');
    },
  });
}

/**
 * Reorder activities within a node (for tree view drag-drop)
 */
export function useReorderActivities() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      curriculumId,
      nodeId,
      activeId,
      overId,
    }: {
      curriculumId: string;
      nodeId: string;
      activeId: string;
      overId: string;
    }) => {
      const activities = queryClient.getQueryData<Article[]>(['activities', curriculumId, nodeId]);
      if (!activities) throw new Error('Activities not found');

      const oldIndex = activities.findIndex((a) => a.id === activeId);
      const newIndex = activities.findIndex((a) => a.id === overId);

      const reordered = [...activities];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      const changes = reordered
        .map((activity, index) => ({
          id: activity.id,
          sequence_number: index + 1,
        }))
        .filter((item, index) => activities[index].id !== item.id);

      if (changes.length === 0) return Promise.resolve();

      return reorderArticles(curriculumId, nodeId, { items: changes });
    },
    onSuccess: (_, { curriculumId, nodeId }) => {
      queryClient.invalidateQueries({ queryKey: ['activities', curriculumId, nodeId] });
      queryClient.invalidateQueries({ queryKey: ['all-activities', curriculumId] });
      toast.success('Activities reordered successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reorder activities');
    },
  });
}

/**
 * Batch reorder activities with optimistic updates and rollback (for list view)
 * @deprecated Use useReorderActivities instead
 */
export function useReorderActivitiesBatch(curriculumId: string, nodeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BatchReorder) => reorderArticles(curriculumId, nodeId, data),

    // Optimistic update (instant UI feedback)
    onMutate: async (newData) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: ['activities', curriculumId, nodeId] });

      // Snapshot previous state for rollback
      const previousActivities = queryClient.getQueryData<Article[]>(['activities', curriculumId, nodeId]);

      // Optimistically update the cache
      queryClient.setQueryData<Article[]>(['activities', curriculumId, nodeId], (old) => {
        if (!old) return old;

        return old.map((activity) => {
          const update = newData.items.find((item) => item.id === activity.id);
          if (update) {
            return { ...activity, sequence_number: update.sequence_number };
          }
          return activity;
        }).sort((a, b) => a.sequence_number - b.sequence_number);
      });

      // Return context for rollback
      return { previousActivities };
    },

    // Rollback on error
    onError: (error: Error, newData, context) => {
      if (context?.previousActivities) {
        queryClient.setQueryData(['activities', curriculumId, nodeId], context.previousActivities);
      }
      toast.error('Failed to reorder activities. Changes reverted.');
      console.error('Reorder error:', error);
    },

    // Refetch on success to ensure sync with server
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', curriculumId, nodeId] });
      toast.success('Activities reordered successfully');
    },
  });
}
