/**
 * React Query hooks for the roll-up (CM-B15 backend, CM-S8 Studio): a level's
 * and a topic's declared targets, coverage and findings, computed on read.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getCurriculumRollup,
  getTopicRollup,
  updateCurriculum,
  updateNode,
  updateTopic,
} from '@/lib/api/curricula';
import { ApiError } from '@/lib/api/client';
import type { NodeRole, TeachingTargetInput } from '@/lib/schemas/curriculum';
import { nodeTypeUpdate, storyNodeErrorText, type STORY_NODE_TYPE } from '@/lib/books/storyNode';

/** Target errors are shown beside the targets, not as a toast. */
export function isTargetsError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === 'INVALID_TEACHING_TARGETS';
}

export const rollupKeys = {
  all: (curriculumId: string) => ['rollup', curriculumId] as const,
  level: (curriculumId: string) => ['rollup', curriculumId, 'level'] as const,
  topic: (curriculumId: string, topicId: string) =>
    ['rollup', curriculumId, 'topic', topicId] as const,
};

export function useCurriculumRollup(curriculumId: string | null) {
  return useQuery({
    queryKey: rollupKeys.level(curriculumId ?? ''),
    queryFn: () => getCurriculumRollup(curriculumId!),
    enabled: !!curriculumId,
    staleTime: 30 * 1000,
  });
}

export function useTopicRollup(curriculumId: string | null, topicId: string | null) {
  return useQuery({
    queryKey: rollupKeys.topic(curriculumId ?? '', topicId ?? ''),
    queryFn: () => getTopicRollup(curriculumId!, topicId!),
    enabled: !!curriculumId && !!topicId,
    staleTime: 30 * 1000,
  });
}

/** Save a topic's targets (the list replaces them); refreshes every roll-up of the level. */
export function useSaveTopicTargets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      curriculumId,
      topicId,
      targets,
    }: {
      curriculumId: string;
      topicId: string;
      targets: TeachingTargetInput[];
    }) => updateTopic(curriculumId, topicId, { targets }),
    onSuccess: (_, { curriculumId }) => {
      queryClient.invalidateQueries({ queryKey: rollupKeys.all(curriculumId) });
      toast.success('Topic targets saved');
    },
    onError: (error: Error) => {
      if (!isTargetsError(error)) toast.error(error.message || 'Failed to save topic targets');
    },
  });
}

/** Save a level's stage label and its objective and prerequisite targets. */
export function useSaveLevelIntent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      curriculumId,
      stage,
      targets,
    }: {
      curriculumId: string;
      stage: string | null;
      targets: TeachingTargetInput[];
    }) => updateCurriculum(curriculumId, { stage, targets }),
    onSuccess: (_, { curriculumId }) => {
      queryClient.invalidateQueries({ queryKey: rollupKeys.all(curriculumId) });
      toast.success('Level targets saved');
    },
    onError: (error: Error) => {
      if (!isTargetsError(error)) toast.error(error.message || 'Failed to save level targets');
    },
  });
}

/**
 * Save a node's role (its `type`), or make it a story node with its book
 * (CM-B36). A story-node refusal is shown beside the picker, not as a toast.
 */
export function useSaveNodeRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      curriculumId,
      topicId,
      nodeId,
      role,
      bookId = null,
    }: {
      curriculumId: string;
      topicId: string;
      nodeId: string;
      role: NodeRole | typeof STORY_NODE_TYPE;
      bookId?: string | null;
    }) => updateNode(curriculumId, topicId, nodeId, nodeTypeUpdate(role, bookId)),
    onSuccess: (_, { curriculumId, topicId }) => {
      queryClient.invalidateQueries({ queryKey: ['all-nodes', curriculumId] });
      queryClient.invalidateQueries({ queryKey: ['nodes', curriculumId, topicId] });
      // a story node's book is checked for decodability in the roll-up
      queryClient.invalidateQueries({ queryKey: rollupKeys.all(curriculumId) });
      toast.success('Node saved');
    },
    onError: (error: Error) => {
      if (!storyNodeErrorText(error)) toast.error(error.message || 'Failed to save node role');
    },
  });
}
