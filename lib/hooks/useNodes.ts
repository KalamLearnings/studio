/**
 * React Query hooks for node operations including batch reorder
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listNodes,
  createNode,
  updateNode,
  deleteNode,
  reorderNodes,
} from '@/lib/api/curricula';
import type { Node, CreateNode, UpdateNode, BatchReorder } from '@/lib/schemas/curriculum';
import { toast } from 'sonner';
import { sortBySequence } from '@/lib/utils/reorder';

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch all nodes for a topic
 */
export function useNodes(curriculumId: string, topicId: string | null) {
  return useQuery({
    queryKey: ['nodes', curriculumId, topicId],
    queryFn: () => listNodes(curriculumId, topicId!),
    enabled: !!topicId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data: Node[]) => [...data].sort((a, b) => a.sequence_number - b.sequence_number), // Always return sorted
  });
}

/**
 * Fetch ALL nodes across all topics in a curriculum
 */
export function useAllNodes(curriculumId: string) {
  return useQuery({
    queryKey: ['all-nodes', curriculumId],
    queryFn: () => listNodes(curriculumId, null),
    enabled: !!curriculumId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data: Node[]) => [...data].sort((a, b) => a.sequence_number - b.sequence_number), // Always return sorted
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new node
 */
export function useCreateNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      curriculumId,
      topicId,
      data,
    }: {
      curriculumId: string;
      topicId: string;
      data: CreateNode;
    }) => createNode(curriculumId, topicId, data),
    onSuccess: (newNode, { curriculumId, topicId }) => {
      // Invalidate to refetch
      queryClient.invalidateQueries({ queryKey: ['nodes', curriculumId, topicId] });
      toast.success('Node created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create node');
    },
  });
}

/**
 * Update an existing node
 */
export function useUpdateNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      curriculumId,
      topicId,
      nodeId,
      data,
    }: {
      curriculumId: string;
      topicId: string;
      nodeId: string;
      data: UpdateNode;
    }) => updateNode(curriculumId, topicId, nodeId, data),
    onSuccess: (_, { curriculumId, topicId }) => {
      queryClient.invalidateQueries({ queryKey: ['nodes', curriculumId, topicId] });
      toast.success('Node updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update node');
    },
  });
}

/**
 * Delete a node
 */
export function useDeleteNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      curriculumId,
      topicId,
      nodeId,
    }: {
      curriculumId: string;
      topicId: string;
      nodeId: string;
    }) => deleteNode(curriculumId, topicId, nodeId),
    onSuccess: (_, { curriculumId, topicId }) => {
      queryClient.invalidateQueries({ queryKey: ['nodes', curriculumId, topicId] });
      toast.success('Node deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete node');
    },
  });
}

/**
 * Batch reorder nodes with optimistic updates and rollback
 */
export function useReorderNodes(curriculumId: string, topicId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BatchReorder) => reorderNodes(curriculumId, topicId, data),

    // Optimistic update (instant UI feedback)
    onMutate: async (newData) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: ['nodes', curriculumId, topicId] });

      // Snapshot previous state for rollback
      const previousNodes = queryClient.getQueryData<Node[]>(['nodes', curriculumId, topicId]);

      // Optimistically update the cache
      queryClient.setQueryData<Node[]>(['nodes', curriculumId, topicId], (old) => {
        if (!old) return old;

        return old.map((node) => {
          const update = newData.items.find((item) => item.id === node.id);
          if (update) {
            return { ...node, sequence_number: update.sequence_number };
          }
          return node;
        }).sort((a, b) => a.sequence_number - b.sequence_number);
      });

      // Return context for rollback
      return { previousNodes };
    },

    // Rollback on error
    onError: (error: Error, newData, context) => {
      if (context?.previousNodes) {
        queryClient.setQueryData(['nodes', curriculumId, topicId], context.previousNodes);
      }
      toast.error('Failed to reorder nodes. Changes reverted.');
      console.error('Reorder error:', error);
    },

    // Refetch on success to ensure sync with server
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes', curriculumId, topicId] });
      toast.success('Nodes reordered successfully');
    },
  });
}
