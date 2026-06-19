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
}

export function useBuilderActions({
  curriculumId,
  topics,
  nodes,
  activities,
  selectedNode,
  clearSelection,
  setNewActivity,
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
    (newActivity: NewActivityState, data: Record<string, unknown>) => {
      createActivity.mutate({
        curriculumId,
        nodeId: newActivity.nodeId,
        data: {
          type: newActivity.type as any,
          instruction: data.instruction
            ? { en: data.instruction as string }
            : { en: newActivity.name },
          config: (data.config || {}) as any,
        },
      });

      setNewActivity(null);
    },
    [curriculumId, createActivity, setNewActivity]
  );

  const handleCancelNewActivity = React.useCallback(() => {
    setNewActivity(null);
  }, [setNewActivity]);

  // Save edits to an existing activity.
  const handleSaveActivity = React.useCallback(
    (activityId: string, data: Record<string, unknown>) => {
      const activity = activities?.find((a) => a.id === activityId);
      if (!activity) return;

      updateActivity.mutate({
        curriculumId,
        nodeId: activity.node_id,
        activityId: activity.id,
        data: {
          type: activity.type,
          instruction: data.instruction
            ? { en: data.instruction as string }
            : activity.instruction,
          config: (data.config || {}) as any,
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
