/**
 * React Query hooks for topic operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listTopics,
  getTopic,
  createTopic,
  updateTopic,
  deleteTopic,
  reorderTopics,
} from '@/lib/api/curricula';
import type { Topic, CreateTopic, UpdateTopic } from '@/lib/schemas/curriculum';
import { toast } from 'sonner';
import { sortBySequence } from '@/lib/utils/reorder';

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch all topics for a curriculum
 */
export function useTopics(curriculumId: string | null) {
  return useQuery({
    queryKey: ['topics', curriculumId],
    queryFn: () => listTopics(curriculumId!),
    enabled: !!curriculumId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data: Topic[]) => [...data].sort((a, b) => a.sequence_number - b.sequence_number), // Always return sorted
  });
}

/**
 * Fetch a single topic
 */
export function useTopic(curriculumId: string | null, topicId: string | null) {
  return useQuery({
    queryKey: ['topic', curriculumId, topicId],
    queryFn: () => getTopic(curriculumId!, topicId!),
    enabled: !!curriculumId && !!topicId,
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new topic
 */
export function useCreateTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      curriculumId,
      data,
    }: {
      curriculumId: string;
      data: CreateTopic;
    }) => createTopic(curriculumId, data),
    onSuccess: (newTopic, { curriculumId }) => {
      // Invalidate to refetch
      queryClient.invalidateQueries({ queryKey: ['topics', curriculumId] });
      toast.success('Topic created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create topic');
    },
  });
}

/**
 * Update an existing topic
 */
export function useUpdateTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      curriculumId,
      topicId,
      data,
    }: {
      curriculumId: string;
      topicId: string;
      data: UpdateTopic;
    }) => updateTopic(curriculumId, topicId, data),
    onSuccess: (_, { curriculumId, topicId }) => {
      queryClient.invalidateQueries({ queryKey: ['topics', curriculumId] });
      queryClient.invalidateQueries({ queryKey: ['topic', curriculumId, topicId] });
      toast.success('Topic updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update topic');
    },
  });
}

/**
 * Delete a topic
 */
export function useDeleteTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      curriculumId,
      topicId,
    }: {
      curriculumId: string;
      topicId: string;
    }) => deleteTopic(curriculumId, topicId),
    onSuccess: (_, { curriculumId, topicId }) => {
      queryClient.invalidateQueries({ queryKey: ['topics', curriculumId] });
      queryClient.removeQueries({ queryKey: ['topic', curriculumId, topicId] });
      toast.success('Topic deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete topic');
    },
  });
}

/**
 * Reorder topics within a curriculum (for drag-and-drop)
 */
export function useReorderTopics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      curriculumId,
      activeId,
      overId,
    }: {
      curriculumId: string;
      activeId: string;
      overId: string;
    }) => {
      const topics = queryClient.getQueryData<Topic[]>(['topics', curriculumId]);
      if (!topics) throw new Error('Topics not found');

      const oldIndex = topics.findIndex((t) => t.id === activeId);
      const newIndex = topics.findIndex((t) => t.id === overId);

      const reordered = [...topics];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      const changes = reordered
        .map((topic, index) => ({
          id: topic.id,
          sequence_number: index + 1,
        }))
        .filter((item, index) => topics[index].id !== item.id);

      if (changes.length === 0) return Promise.resolve();

      return reorderTopics(curriculumId, { items: changes });
    },
    onSuccess: (_, { curriculumId }) => {
      queryClient.invalidateQueries({ queryKey: ['topics', curriculumId] });
      toast.success('Topics reordered successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reorder topics');
    },
  });
}
