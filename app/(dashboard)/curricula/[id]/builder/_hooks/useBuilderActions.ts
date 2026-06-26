"use client";

import * as React from "react";
import type { TreeNode } from "@/components/builder/curriculum-tree";
import type { Letter } from "@/lib/hooks/useLetters";
import type { LetterForm, TopicType, Haraka } from "@/components/builder/letter-selector-modal";
import type { Topic, Node, Article, ActivityTemplate } from "@/lib/schemas/curriculum";
import {
  useCreateTopic,
  useUpdateTopic,
  useDeleteTopic,
} from "@/lib/hooks/useTopics";
import {
  useCreateNode,
  useUpdateNode,
  useDeleteNode,
} from "@/lib/hooks/useNodes";
import {
  useCreateActivity,
  useUpdateActivity,
  useDeleteActivity,
  useMoveActivity,
} from "@/lib/hooks/useActivities";
import { useReorderTopics } from "@/lib/hooks/useTopics";
import { reorderArticles } from "@/lib/api/curricula";
import { useInstantiateTemplate } from "@/lib/hooks/useTemplates";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { NewActivityState } from "./useTreeState";

interface UseBuilderActionsOptions {
  curriculumId: string;
  topics: Topic[] | undefined;
  nodes: Node[] | undefined;
  activities: Article[] | undefined;
  selectedNode: TreeNode | null;
  clearSelection: () => void;
  setNewActivity: (activity: NewActivityState | null) => void;
  selectActivityAfterCreate: (id: string) => void;
}

export function useBuilderActions({
  curriculumId,
  topics,
  nodes,
  activities,
  selectedNode,
  clearSelection,
  setNewActivity,
  selectActivityAfterCreate,
}: UseBuilderActionsOptions) {
  // Mutations
  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();
  const deleteTopic = useDeleteTopic();
  const createNode = useCreateNode();
  const updateNode = useUpdateNode();
  const deleteNode = useDeleteNode();
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();
  const moveActivity = useMoveActivity();
  const reorderTopics = useReorderTopics();
  const instantiateTemplate = useInstantiateTemplate();
  const queryClient = useQueryClient();

  // Modal state
  const [activityPickerOpen, setActivityPickerOpen] = React.useState(false);
  const [letterSelectorOpen, setLetterSelectorOpen] = React.useState(false);
  const [pendingParentId, setPendingParentId] = React.useState<string | null>(null);
  const [pendingTopicId, setPendingTopicId] = React.useState<string | null>(null);

  // Topic actions
  const handleAddTopic = React.useCallback(() => {
    setLetterSelectorOpen(true);
  }, []);

  const handleLetterSelect = React.useCallback(
    (
      letter: Letter | null,
      form: LetterForm,
      topicType: TopicType,
      topicName?: string,
      haraka?: Haraka,
    ) => {
      const title = letter
        ? `Letter ${letter.name_english} (${letter.letter})`
        : topicName || `New ${topicType.charAt(0).toUpperCase() + topicType.slice(1)}`;

      const nextSequence = (topics?.length || 0) + 1;

      createTopic.mutate({
        curriculumId,
        data: {
          title: { en: title },
          letter_id: letter?.id,
          letter_form: letter ? form : undefined,
          letter_haraka:
            letter && haraka && haraka !== "none" ? haraka : undefined,
          type: topicType,
          sequence_number: nextSequence,
        },
      });
    },
    [curriculumId, topics, createTopic]
  );

  // Node actions
  const handleAddNode = React.useCallback(
    (parentId: string) => {
      const topicNodes = nodes?.filter(n => n.topic_id === parentId) || [];
      const nextSequence = topicNodes.length + 1;

      createNode.mutate({
        curriculumId,
        topicId: parentId,
        data: {
          title: { en: "New Node" },
          type: "lesson",
          sequence_number: nextSequence,
        },
      });
    },
    [curriculumId, nodes, createNode]
  );

  // Activity actions
  const handleAddActivity = React.useCallback(
    (parentId: string) => {
      const node = nodes?.find(n => n.id === parentId);
      if (node) {
        setPendingTopicId(node.topic_id);
      }
      setPendingParentId(parentId);
      setActivityPickerOpen(true);
    },
    [nodes]
  );

  const handleSelectActivityType = React.useCallback(
    (type: { id: string; name: string }) => {
      if (!pendingParentId || !pendingTopicId) return;

      setNewActivity({
        type: type.id,
        name: type.name,
        nodeId: pendingParentId,
        topicId: pendingTopicId,
      });

      clearSelection();
      setPendingParentId(null);
      setPendingTopicId(null);
    },
    [pendingParentId, pendingTopicId, setNewActivity, clearSelection]
  );

  const handleSelectTemplate = React.useCallback(
    (template: ActivityTemplate, variables: Record<string, string>) => {
      if (!pendingParentId) return;

      instantiateTemplate.mutate({
        template_id: template.id,
        variables,
        node_id: pendingParentId,
      });

      setPendingParentId(null);
      setPendingTopicId(null);
    },
    [pendingParentId, instantiateTemplate]
  );

  const handleSaveNewActivity = React.useCallback(
    async (newActivity: NewActivityState, data: Record<string, unknown>) => {
      // Instruction text is optional. Save exactly what was typed (trimmed);
      // do NOT fall back to the activity type's name — that previously injected
      // labels like "Sound Blending" into blank instructions.
      const instructionText = (data.instruction as string | undefined)?.trim();
      const voiceId = data.voiceId as string | undefined;

      // The BACKEND owns instruction audio: we send intent only (text + voice),
      // never an audio_url. On create the backend always generates, so no
      // regenerate flag is needed.
      //
      // Await the create so the form keeps showing its loading state until the
      // activity exists, then select it (the tree refetch makes it appear) so
      // the form stays open in edit mode and the resources panel populates.
      // On error the new-activity form is left open so the user can retry.
      const created = await createActivity.mutateAsync({
        curriculumId,
        nodeId: newActivity.nodeId,
        data: {
          type: newActivity.type as any,
          instruction: {
            ...(instructionText ? { en: instructionText } : {}),
            ...(voiceId ? { voiceId } : {}),
          },
          config: (data.config || {}) as any,
        },
      });

      // Hand off to the selection effect: it swaps the new-activity form for the
      // selected created activity in a single commit (no empty-state flicker).
      selectActivityAfterCreate(created.id);

      // Returned to the form so it can read back the backend's audio_url.
      return created;
    },
    [curriculumId, createActivity, selectActivityAfterCreate]
  );

  const handleCancelNewActivity = React.useCallback(() => {
    setNewActivity(null);
  }, [setNewActivity]);

  // Save edits to an existing activity.
  const handleSaveActivity = React.useCallback(
    async (activityId: string, data: Record<string, unknown>) => {
      const activity = activities?.find((a) => a.id === activityId);
      if (!activity) return;

      // The BACKEND owns instruction audio. We send intent only — the
      // instruction text, the chosen voice, and a top-level `regenerateAudio`
      // flag — and never an audio_url. When `regenerateAudio` is false the
      // backend keeps the existing clip; when true it regenerates + overwrites.
      const instructionText = (data.instruction as string | undefined)?.trim();
      const voiceId = data.voiceId as string | undefined;
      const regenerateAudio = data.regenerateAudio === true;

      // Awaited so the form keeps its loading state until the update resolves,
      // and returned so the form can read back the backend's audio_url.
      return updateActivity.mutateAsync({
        curriculumId,
        nodeId: activity.node_id,
        activityId: activity.id,
        data: {
          type: activity.type,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          config: (data.config ?? activity.config ?? {}) as any,
          instruction: instructionText
            ? { en: instructionText, ...(voiceId ? { voiceId } : {}) }
            : activity.instruction,
          regenerateAudio,
        },
      });
    },
    [curriculumId, activities, updateActivity]
  );

  // Publish toggle
  const handleTogglePublish = React.useCallback(
    (targetNode: TreeNode) => {
      const newPublishState = !targetNode.isPublished;

      if (targetNode.type === "topic") {
        const topic = topics?.find(t => t.id === targetNode.id);
        if (topic) {
          updateTopic.mutate({
            curriculumId,
            topicId: topic.id,
            data: { is_published: newPublishState },
          });
        }
      } else if (targetNode.type === "node") {
        const node = nodes?.find(n => n.id === targetNode.id);
        if (node) {
          updateNode.mutate({
            curriculumId,
            topicId: node.topic_id,
            nodeId: node.id,
            data: { is_published: newPublishState },
          });
        }
      } else if (targetNode.type === "activity") {
        const activity = activities?.find(a => a.id === targetNode.id);
        if (activity) {
          updateActivity.mutate({
            curriculumId,
            nodeId: activity.node_id,
            activityId: activity.id,
            data: { is_published: newPublishState },
          });
        }
      }
    },
    [curriculumId, topics, nodes, activities, updateTopic, updateNode, updateActivity]
  );

  // Delete
  const handleDelete = React.useCallback(
    (targetNode: TreeNode) => {
      const confirmMessage = `Are you sure you want to delete this ${targetNode.type}?${
        targetNode.type === "topic"
          ? " This will also delete all nodes and activities within it."
          : targetNode.type === "node"
          ? " This will also delete all activities within it."
          : ""
      }`;

      if (!confirm(confirmMessage)) return;

      if (targetNode.type === "topic") {
        deleteTopic.mutate({ curriculumId, topicId: targetNode.id });
      } else if (targetNode.type === "node") {
        const node = nodes?.find(n => n.id === targetNode.id);
        if (node) {
          deleteNode.mutate({ curriculumId, topicId: node.topic_id, nodeId: node.id });
        }
      } else if (targetNode.type === "activity") {
        const activity = activities?.find(a => a.id === targetNode.id);
        if (activity) {
          deleteActivity.mutate({
            curriculumId,
            nodeId: activity.node_id,
            activityId: activity.id,
          });
        }
      }

      if (selectedNode?.id === targetNode.id) {
        clearSelection();
      }
    },
    [
      curriculumId,
      nodes,
      activities,
      selectedNode,
      clearSelection,
      deleteTopic,
      deleteNode,
      deleteActivity,
    ]
  );

  // Reorder topics (drag-drop in the tree).
  const handleReorderTopics = React.useCallback(
    (activeId: string, overId: string) => {
      reorderTopics.mutate({ curriculumId, activeId, overId });
    },
    [curriculumId, reorderTopics]
  );

  // Reorder activities within a node (drag-drop in the tree).
  //
  // The builder loads activities via `useAllActivities` (cache key
  // `all-activities`), so the per-node `activities` cache that
  // `useReorderActivities` relies on is empty here. We compute the new
  // sequence numbers directly from the loaded `activities` array instead.
  const handleReorderActivities = React.useCallback(
    async (nodeId: string, activeId: string, overId: string) => {
      const nodeActivities = (activities || [])
        .filter((a) => a.node_id === nodeId)
        .sort((a, b) => a.sequence_number - b.sequence_number);

      const oldIndex = nodeActivities.findIndex((a) => a.id === activeId);
      const newIndex = nodeActivities.findIndex((a) => a.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...nodeActivities];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      const changes = reordered
        .map((activity, index) => ({ id: activity.id, sequence_number: index + 1 }))
        .filter((item, index) => nodeActivities[index].id !== item.id);

      if (changes.length === 0) return;

      try {
        await reorderArticles(curriculumId, nodeId, { items: changes });
        queryClient.invalidateQueries({ queryKey: ["all-activities", curriculumId] });
        queryClient.invalidateQueries({ queryKey: ["activities", curriculumId, nodeId] });
        toast.success("Activities reordered");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to reorder activities"
        );
      }
    },
    [curriculumId, activities, queryClient]
  );

  // Move an activity to a different node (drag-drop in the tree).
  const handleMoveActivity = React.useCallback(
    (activityId: string, sourceNodeId: string, targetNodeId: string) => {
      moveActivity.mutate({
        curriculumId,
        activityId,
        sourceNodeId,
        targetNodeId,
      });
    },
    [curriculumId, moveActivity]
  );

  return {
    // Modal state
    activityPickerOpen,
    setActivityPickerOpen,
    letterSelectorOpen,
    setLetterSelectorOpen,
    // Actions
    handleAddTopic,
    handleLetterSelect,
    handleAddNode,
    handleAddActivity,
    handleSelectActivityType,
    handleSelectTemplate,
    handleSaveNewActivity,
    handleSaveActivity,
    handleCancelNewActivity,
    handleTogglePublish,
    handleDelete,
    handleReorderTopics,
    handleReorderActivities,
    handleMoveActivity,
  };
}
