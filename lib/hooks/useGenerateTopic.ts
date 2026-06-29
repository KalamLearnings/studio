/**
 * Hook to save AI-generated topic content via existing CRUD endpoints.
 *
 * Flow:
 * 1. Create the topic via createTopic()
 * 2. For each generated node, create it via createNode()
 * 3. For each activity in each node, create it via createArticle()
 * 4. Invalidate all relevant queries so the tree refreshes
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTopic, createNode, createArticle } from '@/lib/api/curricula';
import type { GeneratedTopic } from '@/lib/api/curricula';
import { toast } from 'sonner';

interface SaveGeneratedTopicParams {
  curriculumId: string;
  generated: GeneratedTopic;
  letterId?: string;
}

/**
 * Maps AI-generated node types to the backend's accepted types.
 * The backend schema is flexible, but the dashboard types are stricter.
 */
function mapNodeType(type: string): 'intro' | 'lesson' | 'assessment' {
  switch (type) {
    case 'intro':
      return 'intro';
    case 'practice':
    case 'review':
    case 'boss':
      return 'assessment';
    case 'lesson':
    default:
      return 'lesson';
  }
}

export function useSaveGeneratedTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ curriculumId, generated, letterId }: SaveGeneratedTopicParams) => {
      // 1. Create the topic
      const topic = await createTopic(curriculumId, {
        title: {
          en: generated.title.en,
          ar: generated.title.ar || generated.title.en,
        },
        description: generated.description ? {
          en: generated.description.en,
          ar: generated.description.ar || generated.description.en,
        } : undefined,
        type: 'lesson',
        // Backend assigns sequence_number (max+1). A hardcoded 1 collided with
        // existing topics; see CreateTopicSchema.
        ...(letterId ? { letter_id: letterId } : {}),
      });

      const topicId = topic.id;
      let totalNodes = 0;
      let totalActivities = 0;

      // 2. Create nodes sequentially (order matters for sequence_number)
      for (let ni = 0; ni < generated.nodes.length; ni++) {
        const genNode = generated.nodes[ni];

        const node = await createNode(curriculumId, topicId, {
          title: {
            en: genNode.title.en,
            ar: genNode.title.ar || genNode.title.en,
          },
          description: {
            en: '',
            ar: '',
          },
          type: mapNodeType(genNode.type),
          // Backend assigns sequence_number (max+1). These nodes join a
          // curriculum that may already have nodes, so ni+1 would collide with
          // the curriculum_id/sequence_number unique constraint. The loop is
          // sequential and awaited, so insertion order is preserved.
        });

        totalNodes++;

        // 3. Create activities for this node
        for (let ai = 0; ai < genNode.activities.length; ai++) {
          const genActivity = genNode.activities[ai];

          await createArticle(curriculumId, {
            node_id: node.id,
            type: genActivity.type as any,
            instruction: {
              en: genActivity.instruction.en || '',
              ar: genActivity.instruction.ar || '',
            },
            config: genActivity.config || {},
            // Backend assigns sequence_number (max+1); sequential awaited loop
            // preserves order. See node creation above.
          });

          totalActivities++;
        }
      }

      return { topicId, totalNodes, totalActivities };
    },

    onSuccess: (result, { curriculumId }) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['topics', curriculumId] });
      queryClient.invalidateQueries({ queryKey: ['all-nodes', curriculumId] });
      queryClient.invalidateQueries({ queryKey: ['all-activities', curriculumId] });

      toast.success(
        `Topic saved with ${result.totalNodes} nodes and ${result.totalActivities} activities. You can now edit them in the builder.`
      );
    },

    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save generated topic');
    },
  });
}
